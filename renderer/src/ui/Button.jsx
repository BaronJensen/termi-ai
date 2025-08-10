import React from 'react';

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  const variantClass = variant === 'secondary' ? 'secondary' : variant === 'ghost' ? 'ghost' : '';
  const classes = ['ds-button', variantClass, className].filter(Boolean).join(' ');
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}


