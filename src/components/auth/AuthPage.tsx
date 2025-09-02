import React from 'react';

const AuthPage: React.FC = () => {
  console.log('AuthPage component is being called!');
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'red', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{ 
        backgroundColor: 'blue', 
        padding: '2rem', 
        borderRadius: '1rem',
        color: 'white',
        textAlign: 'center',
        minWidth: '300px',
        fontSize: '2rem',
        fontWeight: 'bold'
      }}>
        AUTH PAGE IS WORKING!
        <br />
        <br />
        If you can see this, the component is rendering.
        <br />
        <br />
        Background should be RED, this box should be BLUE.
      </div>
    </div>
  );
};

export default AuthPage;

