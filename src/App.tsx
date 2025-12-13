import React from 'react';
import MapSearch from './components/MapSearch';

function App() {
  // .env ファイルから API キーを取得
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>エラー: APIキーが設定されていません</h1>
        <p>.env ファイルに VITE_GOOGLE_MAPS_API_KEY を設定してください。</p>
      </div>
    );
  }

  return (
    <div className="App">
      <h1 style={{ textAlign: 'center', padding: '10px' }}>🗺️ スポット検索マップ</h1>
      {/* 以下のコンポーネントで全てのロジックを処理します */}
      <MapSearch apiKey={apiKey} />
    </div>
  );
}

export default App;