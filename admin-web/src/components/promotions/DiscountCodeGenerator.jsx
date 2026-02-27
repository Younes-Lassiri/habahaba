import { useState } from 'react'
import { Tag, Copy, Check } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../Modal'
import Button from '../Button'
import Input from '../Input'
import Select from '../Select'
import Toast from '../Toast'

export default function DiscountCodeGenerator({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    prefix: 'PROMO',
    length: 8,
    count: 1,
    promotion_id: '',
  })
  const [generatedCodes, setGeneratedCodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(null)

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = formData.prefix
    for (let i = 0; i < formData.length - formData.prefix.length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleGenerate = async () => {
    try {
      setLoading(true)
      const codes = []
      for (let i = 0; i < formData.count; i++) {
        codes.push(generateCode())
      }

      if (formData.promotion_id) {
        // Save codes to promotion
        await api.post(`/promotions/${formData.promotion_id}/codes`, {
          codes,
        })
        setToast({ message: `${codes.length} codes generated and saved`, type: 'success' })
      } else {
        setGeneratedCodes(codes)
        setToast({ message: `${codes.length} codes generated`, type: 'success' })
      }
    } catch (error) {
      console.error('Error generating codes:', error)
      setToast({ message: 'Failed to generate codes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyAll = () => {
    const allCodes = generatedCodes.join('\n')
    navigator.clipboard.writeText(allCodes)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Generate Discount Codes" size="md">
        <div className="space-y-4">
          <Input
            label="Prefix"
            value={formData.prefix}
            onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
            placeholder="PROMO"
            maxLength={6}
          />

          <Input
            label="Code Length"
            type="number"
            min="6"
            max="20"
            value={formData.length}
            onChange={(e) => setFormData({ ...formData, length: parseInt(e.target.value) })}
          />

          <Input
            label="Number of Codes"
            type="number"
            min="1"
            max="100"
            value={formData.count}
            onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) })}
          />

          <Input
            label="Promotion ID (Optional)"
            type="number"
            value={formData.promotion_id}
            onChange={(e) => setFormData({ ...formData, promotion_id: e.target.value })}
            placeholder="Link to existing promotion"
          />

          <Button onClick={handleGenerate} variant="primary" className="w-full" loading={loading}>
            <Tag className="w-4 h-4 mr-2" />
            Generate Codes
          </Button>

          {generatedCodes.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-800">Generated Codes</h4>
                <Button onClick={handleCopyAll} variant="outline" size="sm">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy All
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {generatedCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded"
                    >
                      <code className="text-sm font-mono text-gray-800">{code}</code>
                      <button
                        onClick={() => handleCopy(code)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  )
}



