import React from 'react';

export default function Label({ className = '', children, ...props }) {
  const classes = ['ds-label', className].filter(Boolean).join(' ');
  return <label className={classes} {...props}>{children}</label>;
}


