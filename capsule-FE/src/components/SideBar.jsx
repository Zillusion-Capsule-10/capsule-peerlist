export function SideBar() {
  const menuItems = ['Home', 'Library', 'Playlists', 'Settings'];

  return (
    <div style={{
      width: '240px',
      backgroundColor: '#1a1a1a',
      height: '100%',
      borderRight: '1px solid #333',
      padding: '20px',
    }}>
      {menuItems.map((item) => (
        <div
          key={item}
          style={{
            color: 'white',
            padding: '10px',
            marginBottom: '5px',
            cursor: 'pointer',
            borderRadius: '4px',
            ':hover': {
              backgroundColor: '#333',
            },
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
