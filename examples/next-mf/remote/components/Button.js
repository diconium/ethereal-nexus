import React, { useEffect } from 'react';

const Button = props => {
  useEffect(() => {
    console.log('hooks work');
  }, []);
  return <button>Remote Button</button>;
};

export default Button;
