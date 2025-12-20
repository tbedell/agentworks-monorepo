import type { CanvasComponent } from '../../types/ui-builder';

interface ComponentRendererProps {
  component: CanvasComponent;
}

export function ComponentRenderer({ component: comp }: ComponentRendererProps) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      {comp.type === 'button' && (
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {comp.properties.text}
        </button>
      )}
      {comp.type === 'input' && (
        <input
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          placeholder={comp.properties.text}
        />
      )}
      {comp.type === 'card' && (
        <div className="w-full h-full bg-white border border-gray-200 rounded shadow-sm p-4">
          <h4 className="font-medium text-gray-900">{comp.properties.text}</h4>
          <p className="text-sm text-gray-500 mt-1">Card content area</p>
        </div>
      )}
      {comp.type === 'container' && (
        <div className="w-full h-full border-2 border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center">
          <span className="text-gray-400 text-sm">{comp.properties.text || 'Container'}</span>
        </div>
      )}
      {comp.type === 'grid' && (
        <div className="w-full h-full grid grid-cols-3 gap-2 p-2 border border-gray-200 rounded bg-gray-50">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-blue-100 rounded h-8 flex items-center justify-center text-xs text-blue-600">
              {i}
            </div>
          ))}
        </div>
      )}
      {comp.type === 'flexbox' && (
        <div className="w-full h-full flex gap-2 p-2 border border-gray-200 rounded bg-gray-50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 bg-purple-100 rounded flex items-center justify-center text-xs text-purple-600">
              Flex {i}
            </div>
          ))}
        </div>
      )}
      {comp.type === 'table' && (
        <div className="w-full h-full overflow-auto">
          <table className="w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 border">Col 1</th>
                <th className="px-2 py-1 border">Col 2</th>
                <th className="px-2 py-1 border">Col 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-1 border">Data</td>
                <td className="px-2 py-1 border">Data</td>
                <td className="px-2 py-1 border">Data</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {comp.type === 'modal' && (
        <div className="w-full h-full bg-white rounded shadow-lg border border-gray-200 p-3">
          <div className="flex justify-between items-center border-b pb-2 mb-2">
            <span className="font-medium">{comp.properties.text || 'Modal'}</span>
            <span className="text-gray-400 cursor-pointer">x</span>
          </div>
          <div className="text-sm text-gray-500">Modal content</div>
        </div>
      )}
      {comp.type === 'navigation' && (
        <div className="w-full h-full bg-gray-800 text-white p-2 rounded flex items-center gap-4">
          <span className="font-bold">Logo</span>
          <div className="flex gap-3 text-sm">
            <span className="hover:text-blue-300 cursor-pointer">Home</span>
            <span className="hover:text-blue-300 cursor-pointer">About</span>
            <span className="hover:text-blue-300 cursor-pointer">Contact</span>
          </div>
        </div>
      )}
      {comp.type === 'list' && (
        <div className="w-full h-full space-y-1 p-2">
          {['Item 1', 'Item 2', 'Item 3'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              {item}
            </div>
          ))}
        </div>
      )}
      {comp.type === 'chart' && (
        <div className="w-full h-full flex items-end gap-1 p-2 border border-gray-200 rounded bg-gray-50">
          {[40, 70, 45, 90, 60].map((h, i) => (
            <div key={i} className="flex-1 bg-blue-500 rounded-t" style={{ height: `${h}%` }}></div>
          ))}
        </div>
      )}
      {comp.type === 'form' && (
        <div className="w-full h-full p-2 space-y-2">
          <div>
            <label className="text-xs text-gray-600">Label</label>
            <input className="w-full px-2 py-1 text-sm border border-gray-300 rounded" placeholder="Input" />
          </div>
          <button className="w-full px-2 py-1 bg-blue-600 text-white text-sm rounded">Submit</button>
        </div>
      )}
    </div>
  );
}
