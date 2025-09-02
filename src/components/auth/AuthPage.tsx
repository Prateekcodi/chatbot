import React from 'react';

const AuthPage: React.FC = () => {
  console.log('AuthPage component is being called!');
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: 'red', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 9999,
      margin: 0,
      padding: 0,
      overflow: 'hidden'
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
        <br />
        <br />
        Now using position: fixed with overflow: hidden.
      </div>
    </div>
  );
};

export default AuthPage;

