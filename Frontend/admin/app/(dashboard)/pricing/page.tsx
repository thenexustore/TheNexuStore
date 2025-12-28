'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Save } from 'lucide-react'

const pricingRules = [
  { id: 1, scope: 'Category', target: 'Laptops', margin: '15%', priority: 1 },
  { id: 2, scope: 'Category', target: 'Accessories', margin: '25%', priority: 1 },
  { id: 3, scope: 'Brand', target: 'Apple', margin: '10%', priority: 2 },
  { id: 4, scope: 'Global', target: 'All Products', margin: '20%', priority: 0 },
]

export default function PricingPage() {
  const [rules, setRules] = useState(pricingRules)
  const [newRule, setNewRule] = useState({
    scope: 'Global',
    target: '',
    margin: '',
    priority: '1'
  })

  const handleAddRule = () => {
    const newId = Math.max(...rules.map(r => r.id)) + 1
    setRules([...rules, {
      id: newId,
      scope: newRule.scope as any,
      target: newRule.target || 'All Products',
      margin: newRule.margin + '%',
      priority: parseInt(newRule.priority)
    }])
    setNewRule({ scope: 'Global', target: '', margin: '', priority: '1' })
  }

  return (
    <div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Current Rules</h2>
              <div className="text-sm text-gray-500">
                Higher priority rules win
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rules.sort((a, b) => b.priority - a.priority).map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          rule.scope === 'Global' ? 'bg-purple-100 text-purple-800' :
                          rule.scope === 'Category' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rule.scope}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{rule.target}</td>
                      <td className="px-6 py-4">
                        <span className="text-green-600 font-medium">{rule.margin}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          rule.priority >= 2 ? 'bg-red-100 text-red-800' :
                          rule.priority === 1 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button className="text-blue-600 hover:text-blue-800">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setRules(rules.filter(r => r.id !== rule.id))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-6">Add New Rule</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scope</label>
              <select
                value={newRule.scope}
                onChange={(e) => setNewRule({...newRule, scope: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Global">Global</option>
                <option value="Category">Category</option>
                <option value="Brand">Brand</option>
                <option value="Product">Product</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {newRule.scope === 'Global' ? 'Target (Global applies to all)' : 'Target Name'}
              </label>
              <input
                type="text"
                value={newRule.target}
                onChange={(e) => setNewRule({...newRule, target: e.target.value})}
                placeholder={newRule.scope === 'Global' ? 'All Products' : 'Enter name...'}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={newRule.scope === 'Global'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Margin %</label>
              <input
                type="number"
                value={newRule.margin}
                onChange={(e) => setNewRule({...newRule, margin: e.target.value})}
                placeholder="20"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={newRule.priority}
                onChange={(e) => setNewRule({...newRule, priority: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">0 - Lowest</option>
                <option value="1">1 - Medium</option>
                <option value="2">2 - High</option>
                <option value="3">3 - Highest</option>
              </select>
            </div>
            <button
              onClick={handleAddRule}
              className="w-full flex items-center justify-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pricing Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}