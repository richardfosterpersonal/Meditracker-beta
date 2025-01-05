const notificationTemplates = {
    UPCOMING_DOSE: {
        title: 'Medication Reminder',
        template: (medication) => ({
            title: 'Time to Take Your Medication',
            body: `It's time to take ${medication.name} (${medication.dosage})`,
            icon: '/icons/medicine.png',
            priority: 'normal',
            tag: `medication-${medication.id}`,
            requireInteraction: true
        })
    },
    MISSED_DOSE: {
        title: 'Missed Medication',
        template: (medication) => ({
            title: 'Missed Medication Alert',
            body: `You missed your scheduled dose of ${medication.name}`,
            icon: '/icons/warning.png',
            priority: 'high',
            tag: `missed-${medication.id}`,
            requireInteraction: true
        })
    },
    INTERACTION_WARNING: {
        title: 'Medication Interaction Warning',
        template: (med1, med2) => ({
            title: 'Potential Medication Interaction',
            body: `Warning: Potential interaction between ${med1.name} and ${med2.name}. Please consult your healthcare provider.`,
            icon: '/icons/alert.png',
            priority: 'high',
            tag: `interaction-${med1.id}-${med2.id}`,
            requireInteraction: true
        })
    },
    REFILL_REMINDER: {
        title: 'Refill Reminder',
        template: (medication) => ({
            title: 'Medication Refill Needed',
            body: `Your supply of ${medication.name} is running low. Time to refill!`,
            icon: '/icons/refill.png',
            priority: 'normal',
            tag: `refill-${medication.id}`,
            requireInteraction: false
        })
    }
};

export default notificationTemplates;
