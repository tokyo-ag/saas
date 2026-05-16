'use client';
import { usePushNotification } from '@/hooks/usePushNotification';

export default function PushNotificationSetup() {
  usePushNotification();
  return null;
}
