import React from 'react';

export default function Textarea({ className = '', ...props }) {
  const classes = ['ds-textarea', className].filter(Boolean).join(' ');
  return <textarea className={classes} {...props} />;
}


