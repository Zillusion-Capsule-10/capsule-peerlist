import "react-native-get-random-values";
import { View, StyleSheet, Animated, Alert } from "react-native";
import { Audio } from "expo-av";
import { useState, useEffect } from "react";
import * as FileSystem from "expo-file-system";
import AWS from "aws-sdk";
import { Buffer } from "@craftzdog/react-native-buffer";
import { useSupabase } from "@/context/supabase-provider";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

// Initialize S3 client with v2
const s3 = new AWS.S3({
	accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY,
	region: process.env.EXPO_PUBLIC_rAWS_REGION, // Replace with your bucket's region, e.g., 'us-east-1'
});

// Define a function to make the API call
interface ApiCallData {
	key: string;
}

async function makeApiCall(data: ApiCallData, session: any) {
	if (!session?.access_token || !session?.user?.id) {
		throw new Error("User not authenticated");
	}

	// Define the API endpoint
	const { key } = data;
	const apiUrl =
		"https://deepgram-integration-l5v0.onrender.com/startTranscription";

	// Data to send in the request body
	const requestData = {
		key,
		userId: session.user.id, // Include the user ID in the payload
	};

	console.log("Making API call to:", apiUrl, requestData);

	// Make the fetch call
	fetch(apiUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${session.access_token}`,
		},
		body: JSON.stringify(requestData),
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.json(); // Parse the JSON response
		})
		.then((data) => {
			console.log("Response from server:", data);
		})
		.catch((error) => {
			console.error("Error making the API call:", error);
		});
}

export default function Home() {
	const [recording, setRecording] = useState<Audio.Recording | undefined>(
		undefined,
	);
	const [isUploading, setIsUploading] = useState(false);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [permissionResponse, requestPermission] = Audio.usePermissions();
	const dotOpacity = useState(new Animated.Value(1))[0];
	const { session } = useSupabase();

	useEffect(() => {
		Audio.setAudioModeAsync({
			allowsRecordingIOS: true,
			playsInSilentModeIOS: true,
			staysActiveInBackground: true,
			// interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
			// interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
			shouldDuckAndroid: true,
		});
	}, []);

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (recording) {
			timer = setInterval(() => {
				setRecordingDuration((prev) => prev + 1);
			}, 1000);

			// Create blinking animation
			Animated.loop(
				Animated.sequence([
					Animated.timing(dotOpacity, {
						toValue: 0,
						duration: 500,
						useNativeDriver: true,
					}),
					Animated.timing(dotOpacity, {
						toValue: 1,
						duration: 500,
						useNativeDriver: true,
					}),
				]),
			).start();
		} else {
			setRecordingDuration(0);
			dotOpacity.setValue(1);
		}

		return () => {
			if (timer) clearInterval(timer);
		};
	}, [recording]);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	async function startRecording() {
		try {
			if (permissionResponse?.status !== "granted") {
				console.log("Requesting permission..");
				await requestPermission();
			}

			// Unload any existing recording first
			if (recording) {
				await recording.stopAndUnloadAsync();
			}

			await Audio.setAudioModeAsync({
				allowsRecordingIOS: true,
				playsInSilentModeIOS: true,
				staysActiveInBackground: true,
				// interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
				// interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
				shouldDuckAndroid: true,
			});

			// Wait a bit longer for audio session to be configured
			await new Promise((resolve) => setTimeout(resolve, 500));

			console.log("Starting recording..");
			const { recording: newRecording } = await Audio.Recording.createAsync(
				Audio.RecordingOptionsPresets.HIGH_QUALITY,
			);

			setRecording(newRecording);
			console.log("Recording started");
		} catch (err) {
			console.error("Failed to start recording", err);
		}
	}

	async function stopRecording() {
		if (!recording) return;

		try {
			console.log("Stopping recording..");
			setRecording(undefined);
			await recording.stopAndUnloadAsync();
			await Audio.setAudioModeAsync({
				allowsRecordingIOS: false,
			});

			const uri = recording.getURI();
			if (!uri) throw new Error("No recording URI found");

			// Check if file exists
			const fileInfo = await FileSystem.getInfoAsync(uri);
			if (!fileInfo.exists) {
				throw new Error("Recording file not found");
			}

			// Upload to S3
			const userId = session?.user?.id;
			setIsUploading(true);
			const filename = `recording-${Date.now()}-${userId || Math.random()}.m4a`;

			// Read file content as base64
			const base64Data = await FileSystem.readAsStringAsync(uri, {
				encoding: FileSystem.EncodingType.Base64,
			});

			// Convert base64 to Buffer
			const buffer = Buffer.from(base64Data, "base64");

			// Use AWS SDK v2's upload method
			const data = await new Promise((resolve, reject) => {
				s3.upload(
					{
						Bucket: "zillusion-capsule-audio-s3",
						Key: filename,
						Body: buffer,
						ContentType: "audio/x-m4a",
					},
					(err: any, data: unknown) => {
						if (err) reject(err);
						else resolve(data);
					},
				);
			});
			Alert.alert("Success", "Recording uploaded successfully!");
			// @ts-ignore
			await makeApiCall(data, session);

			console.log("Recording uploaded successfully to S3", data);
		} catch (error) {
			console.error("Error uploading recording:", error);
			if (error instanceof Error) {
				console.error("Error details:", error.message);
				console.error("Error stack:", error.stack);
				Alert.alert("Error", `Upload failed: ${error.message}`);
			} else {
				Alert.alert("Error", "Upload failed: An unknown error occurred");
			}
		} finally {
			setIsUploading(false);
		}
	}

	return (
		<View className="flex-1 items-center justify-center bg-background p-4 gap-y-4">
			{recording ? (
				<View style={styles.recordingContainer}>
					<Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
					<Text>{formatTime(recordingDuration)}</Text>
				</View>
			) : (
				<View style={styles.recordingContainer}>
					<Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
					<Text>{formatTime(0)}</Text>
				</View>
			)}
			<Button
				className="w-full"
				variant="default"
				size="default"
				onPress={recording ? stopRecording : startRecording}
				disabled={isUploading}
			>
				<Text>
					{isUploading
						? "Uploading..."
						: recording
							? "Stop Recording"
							: "Start Recording"}
				</Text>
			</Button>
		</View>
	);
}

const styles = StyleSheet.create({
	recordingContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginVertical: 10,
		gap: 8,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "red",
	},
});
