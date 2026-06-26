export interface AppNotification {
  title: string;
  message: string;
  type: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  channels: string[];
}

export abstract class NotificationCreator {
  abstract createNotification(title: string, message: string, type: string): AppNotification;

  /**
   * Envía la notificación, opcionalmente llamando a N8N workflows o guardando en consola/BD.
   */
  async send(userId: string, title: string, message: string, type: string): Promise<AppNotification> {
    const notification = this.createNotification(title, message, type);

    console.log(`[Notification System] Enviando a usuario ${userId}:`, notification);

    // Integración opcional con N8N Webhooks
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nUrl) {
      try {
        await fetch(n8nUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            ...notification,
          }),
        });
      } catch (error) {
        console.error("[Notification System] Error al invocar el webhook de N8N:", error);
      }
    }

    return notification;
  }
}

export class AdminNotificationCreator extends NotificationCreator {
  createNotification(title: string, message: string, type: string): AppNotification {
    return {
      title: `🚨 [CRÍTICO - ADMIN] ${title}`,
      message,
      type,
      priority: "HIGH",
      channels: ["database", "email", "sms"],
    };
  }
}

export class EmpresaNotificationCreator extends NotificationCreator {
  createNotification(title: string, message: string, type: string): AppNotification {
    return {
      title: `🔔 [OPERATIVO] ${title}`,
      message,
      type,
      priority: "MEDIUM",
      channels: ["database", "email"],
    };
  }
}

export class FreeNotificationCreator extends NotificationCreator {
  createNotification(title: string, message: string, type: string): AppNotification {
    return {
      title: `✉️ ${title}`,
      message,
      type,
      priority: "LOW",
      channels: ["database"],
    };
  }
}

export class NotificationFactory {
  static getCreator(role: string): NotificationCreator {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return new AdminNotificationCreator();
      case "OPERACIONES":
      case "SUPERVISOR":
      case "CAPTURISTA":
        return new EmpresaNotificationCreator();
      case "CONDUCTOR":
      default:
        return new FreeNotificationCreator();
    }
  }
}
