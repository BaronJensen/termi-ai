import React from 'react';

export default function Badge({ className = '', children, ...props }) {
  const classes = ['ds-badge', className].filter(Boolean).join(' ');
  return <span className={classes} {...props}>{children}</span>;
}


