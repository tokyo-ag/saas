import { permanentRedirect } from 'next/navigation';

export default function AdminLoginRedirect() {
  permanentRedirect('/login');
}
