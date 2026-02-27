import { forwardRef } from 'react'

const Select = forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      options = [],
      placeholder = 'Select an option',
      className = '',
      containerClassName = '',
      ...props
    },
    ref
  ) => {
    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
            error
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300'
          } ${className}`}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => {
            if (typeof option === 'string') {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              )
            }
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            )
          })}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select



