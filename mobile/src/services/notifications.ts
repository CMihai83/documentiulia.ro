import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      // Get Expo push token
      if (Device.isDevice) {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'documentiulia-prod',
        });
        this.expoPushToken = tokenData.data;

        // Register token with backend
        await api.registerPushToken(this.expoPushToken);
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      console.log('Push notifications initialized');
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  private async setupAndroidChannels(): Promise<void> {
    // Main notification channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificari',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E3A8A',
    });

    // Financial alerts channel
    await Notifications.setNotificationChannelAsync('financial', {
      name: 'Alerte Financiare',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });

    // Deadline reminders channel
    await Notifications.setNotificationChannelAsync('deadlines', {
      name: 'Termene',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: trigger || null, // null = immediate
    });

    return notificationId;
  }

  async scheduleVATDeadlineReminder(dueDate: Date, amount: number): Promise<void> {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before

    await this.scheduleLocalNotification(
      'Termen TVA',
      `Declaratia TVA in valoare de ${amount.toFixed(2)} RON trebuie depusa pana pe ${dueDate.toLocaleDateString('ro-RO')}`,
      { type: 'vat_deadline', dueDate: dueDate.toISOString(), amount },
      {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      }
    );
  }

  async scheduleInvoiceDueReminder(
    invoiceNumber: string,
    clientName: string,
    amount: number,
    dueDate: Date
  ): Promise<void> {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before

    await this.scheduleLocalNotification(
      'Factura Scadenta',
      `Factura ${invoiceNumber} (${clientName}) de ${amount.toFixed(2)} RON este scadenta maine`,
      { type: 'invoice_due', invoiceNumber, clientName, amount },
      {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      }
    );
  }

  async scheduleD406Reminder(month: string, year: number): Promise<void> {
    // D406 deadline is the 25th of the following month
    const deadline = new Date(year, parseInt(month), 25);
    const reminderDate = new Date(deadline);
    reminderDate.setDate(reminderDate.getDate() - 5); // 5 days before

    await this.scheduleLocalNotification(
      'Termen SAF-T D406',
      `Declaratia SAF-T pentru luna ${month}/${year} trebuie depusa pana pe ${deadline.toLocaleDateString('ro-RO')}`,
      { type: 'd406_deadline', month, year },
      {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      }
    );
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  onNotificationReceived(callback: (notification: Notifications.Notification) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    return () => subscription.remove();
  }

  onNotificationResponse(
    callback: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(callback);
    return () => subscription.remove();
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default new NotificationService();
