"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

const imports = [
  {
    id: 1,
    type: "Catalog",
    status: "Success",
    items: 245,
    time: "10:30 AM",
    duration: "2m 15s",
  },
  {
    id: 2,
    type: "Stock",
    status: "Success",
    items: 567,
    time: "10:15 AM",
    duration: "1m 45s",
  },
  {
    id: 3,
    type: "Prices",
    status: "Failed",
    items: 245,
    time: "10:00 AM",
    duration: "0m 30s",
  },
  {
    id: 4,
    type: "Catalog",
    status: "Success",
    items: 250,
    time: "09:45 AM",
    duration: "2m 30s",
  },
];

export default function ImportsPage() {
  const [isRunning, setIsRunning] = useState(false);

  const handleRunImport = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 3000);
  };

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Run Manual Import</h2>
            <p className="text-gray-600 text-sm">
              Trigger manual import from INFORTISA
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 rounded-lg border hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer">
              Import Catalog
            </button>
            <button className="px-4 py-2 rounded-lg border hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer">
              Import Stock
            </button>
            <button className="px-4 py-2 rounded-lg border hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer">
              Import Prices
            </button>
            <button
              onClick={handleRunImport}
              disabled={isRunning}
              className="flex items-center px-4 py-2 rounded-lg border hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run All
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Import History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {imports.map((imp) => (
                <tr key={imp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium">{imp.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        imp.status === "Success"
                          ? "bg-green-100 text-green-800"
                          : imp.status === "Failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {imp.status === "Success" ? (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      ) : imp.status === "Failed" ? (
                        <XCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <Clock className="w-4 h-4 mr-1" />
                      )}
                      {imp.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">{imp.items} items</td>
                  <td className="px-6 py-4 text-gray-500">{imp.time}</td>
                  <td className="px-6 py-4">{imp.duration}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      View Logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
