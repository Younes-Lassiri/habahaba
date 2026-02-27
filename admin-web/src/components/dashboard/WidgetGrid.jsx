import { useState } from 'react'
import Widget from './Widget'

export default function WidgetGrid({ widgets = [], onRemoveWidget, onUpdateWidgets }) {
  const [draggedWidget, setDraggedWidget] = useState(null)

  const handleDragStart = (e, widgetId) => {
    setDraggedWidget(widgetId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, targetWidgetId) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget === targetWidgetId) {
      setDraggedWidget(null)
      return
    }

    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidget)
    const targetIndex = widgets.findIndex((w) => w.id === targetWidgetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWidget(null)
      return
    }

    const newWidgets = [...widgets]
    const [removed] = newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(targetIndex, 0, removed)

    if (onUpdateWidgets) {
      onUpdateWidgets(newWidgets)
    }

    setDraggedWidget(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {widgets.map((widget) => (
        <div
          key={widget.id}
          draggable
          onDragStart={(e) => handleDragStart(e, widget.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, widget.id)}
          className={draggedWidget === widget.id ? 'opacity-50' : ''}
        >
          <Widget
            id={widget.id}
            title={widget.title}
            onRemove={onRemoveWidget}
            onSettings={widget.onSettings}
            draggable={true}
          >
            {widget.content}
          </Widget>
        </div>
      ))}
    </div>
  )
}



