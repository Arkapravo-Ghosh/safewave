"use client";

import { useCallback, useState } from "react";

type NotificationPermissionState = NotificationPermission | "unsupported";

function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>("default");

  const requestPermission = useCallback(async () => {
    const currentPermission = getNotificationPermission();

    if (currentPermission === "unsupported") {
      setPermission("unsupported");
      return "unsupported";
    }

    if (currentPermission !== "default") {
      setPermission(currentPermission);
      return currentPermission;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  const notify = useCallback((title: string, options?: NotificationOptions) => {
    const currentPermission = getNotificationPermission();

    if (currentPermission !== "granted") {
      setPermission(currentPermission);
      return false;
    }

    setPermission("granted");
    new Notification(title, options);
    return true;
  }, []);

  return {
    supported: permission !== "unsupported",
    permission,
    requestPermission,
    notify,
  };
}
