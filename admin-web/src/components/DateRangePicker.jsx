import { useState } from 'react'
import { Calendar } from 'lucide-react'
import Input from './Input'

export default function DateRangePicker({ onDateRangeChange, className = '' }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleStartDateChange = (e) => {
    const date = e.target.value
    setStartDate(date)
    if (onDateRangeChange) {
      onDateRangeChange({ start: date, end: endDate })
    }
  }

  const handleEndDateChange = (e) => {
    const date = e.target.value
    setEndDate(date)
    if (onDateRangeChange) {
      onDateRangeChange({ start: startDate, end: date })
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="w-4 h-4 text-gray-400" />
      <Input
        type="date"
        value={startDate}
        onChange={handleStartDateChange}
        placeholder="Start Date"
        className="flex-1"
      />
      <span className="text-gray-400">to</span>
      <Input
        type="date"
        value={endDate}
        onChange={handleEndDateChange}
        placeholder="End Date"
        className="flex-1"
      />
    </div>
  )
}
