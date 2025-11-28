import { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium';
  children: React.ReactNode;
}

export default function Button({
  variant = 'secondary',
  size = 'medium',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const classNames = [styles.btn, styles[`btn--${variant}`], styles[`btn--${size}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  );
}
