import { useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import Input from './Input'
import Select from './Select'
import Button from './Button'
import DateRangePicker from './DateRangePicker'

export default function NotificationScheduler({ onSchedule, templates = [] }) {
  const [formData, setFormData] = useState({
    template_id: '',
    target: 'clients',
    scheduled_at: '',
    time: '',
  })

  const handleSchedule = () => {
    if (onSchedule) {
      const scheduledDateTime = `${formData.scheduled_at}T${formData.time}`
      onSchedule({
        template_id: formData.template_id,
        target: formData.target,
        scheduled_at: scheduledDateTime,
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">Schedule Notification</h3>
      </div>

      <Select
        label="Template"
        value={formData.template_id}
        onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
        options={templates.map((t) => ({ value: t.id, label: t.name }))}
        required
      />

      <Select
        label="Target Audience"
        value={formData.target}
        onChange={(e) => setFormData({ ...formData, target: e.target.value })}
        options={[
          { value: 'clients', label: 'All Clients' },
          { value: 'delivery_men', label: 'All Delivery Men' },
        ]}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={formData.scheduled_at}
          onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
          required
        />
        <Input
          label="Time"
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />
      </div>

      <Button onClick={handleSchedule} variant="primary" className="w-full" disabled={!formData.template_id || !formData.scheduled_at || !formData.time}>
        Schedule Notification
      </Button>
    </div>
  )
}



