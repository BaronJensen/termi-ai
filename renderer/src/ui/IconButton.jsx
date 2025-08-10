import React from 'react';

export default function IconButton({ className = '', children, ...props }) {
  const classes = ['ds-icon-button', className].filter(Boolean).join(' ');
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}


