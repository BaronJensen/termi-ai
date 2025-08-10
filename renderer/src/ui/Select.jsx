import React from 'react';

export default function Select({ className = '', children, ...props }) {
  const classes = ['ds-select', className].filter(Boolean).join(' ');
  return <select className={classes} {...props}>{children}</select>;
}


