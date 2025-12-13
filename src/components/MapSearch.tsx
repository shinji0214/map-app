// src/components/MapSearch.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, StandaloneSearchBox } from '@react-google-maps/api';

// 地図のコンテナスタイルを定義
const containerStyle = {
  width: '100%',
  height: '85vh'
};

// Places API を使用するために、ライブラリ名として 'places' を指定
const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places'];

interface MapSearchProps {
    apiKey: string;
}

// MapSearch コンポーネントの定義
export default function MapSearch({ apiKey }: MapSearchProps) {
  // 地図の中心となる位置情報 (緯度・経度)
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  // GoogleMap インスタンスを保持 (検索などでAPIを使うために必要)
  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  // 検索クエリと結果を保持するState
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.PlaceResult[]>([]);

  // ----------------------------------------------------
  // A. Google Maps JS API のロード
  // ----------------------------------------------------
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: libraries, // Places API をロード
  });
  
  // ----------------------------------------------------
  // B. 現在地の取得 (コンポーネントロード時に一度だけ実行)
  // ----------------------------------------------------
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // 成功: 取得した緯度・経度をセット
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // 失敗: デフォルト位置 (東京駅周辺) をセット
          setCurrentPosition({ lat: 35.681236, lng: 139.767125 });
          console.warn('現在地の取得に失敗しました。');
        }
      );
    } else {
      // ブラウザ非対応: デフォルト位置をセット
      setCurrentPosition({ lat: 35.681236, lng: 139.767125 });
    }
  }, []);

  // ----------------------------------------------------
  // C. 検索処理 (Places API の nearbySearch)
  // ----------------------------------------------------
  const handleSearch = () => {
    // APIがロード済みで、地図インスタンスがあり、現在地が取得できていれば実行
    if (!map || !searchQuery || !currentPosition || !isLoaded) return;

    // PlacesService を使用して検索リクエストを構築
    const service = new google.maps.places.PlacesService(map);

    const request: google.maps.places.PlaceSearchRequest = {
        location: currentPosition, // 現在地を中心として検索
        radius: 5000, // 5km 圏内
        keyword: searchQuery, // ユーザーの入力キーワード
    };

    service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setSearchResults(results);
            // 検索結果の最初の場所に地図の中心を移動
            if (results[0].geometry?.location) {
                map.panTo(results[0].geometry.location);
            }
        } else {
            console.error('検索エラー:', status);
            alert(`スポット検索に失敗しました: ${status}`);
            setSearchResults([]);
        }
    });
  };

  // ----------------------------------------------------
  // 新規追加: 選択されたスポットを保持するState
  // ----------------------------------------------------
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);

  // ----------------------------------------------------
  // 新規追加: SearchBox のインスタンスを保持するための Ref
  // ----------------------------------------------------
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  // ----------------------------------------------------
  // 💡 検索処理の修正: Autocomplete の候補選択時
  // ----------------------------------------------------
  const onPlacesChanged = () => {
    // SearchBox のインスタンスがなければ終了
    if (!searchBoxRef.current) return;

    // ユーザーが選択した場所の結果を取得
    const places = searchBoxRef.current.getPlaces();
    if (!places || places.length === 0) return;

    const firstPlace = places[0];
    
    // 場所の緯度経度を取得し、地図を移動
    if (firstPlace.geometry?.location) {
      const newCenter = {
        lat: firstPlace.geometry.location.lat(),
        lng: firstPlace.geometry.location.lng(),
      };
      // 地図の中心を移動し、新しい中心座標をStateにセット
      map?.panTo(newCenter);
      setCurrentPosition(newCenter); // 新しい検索場所を次回の検索の中心にする
      
      // 選択した場所を検索結果として表示リストに追加する処理（ここではスキップし、地図移動のみに集中）
      setSearchResults([firstPlace]); 
      setSelectedPlace(firstPlace); // 情報ウィンドウを自動で開く

    } else {
      console.error("場所のジオメトリ情報が見つかりません。");
    }
  };

    // 地図がロードされたときの処理
    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);

        // 🚨 レイアウト修正のキモ: 地図が親のサイズを正しく認識できるように、強制的にリサイズイベントを発火させる
        if (window.google?.maps) {
            google.maps.event.trigger(map, 'resize');
        }
        
        // 現在地へ地図の中心を移動（地図インスタンスをセットした直後に実行）
        if (currentPosition) {
            map.setCenter(currentPosition);
        }
    }, [currentPosition]); // currentPosition が変更されたときだけ関数を再生成

    // 地図コンポーネントが破棄されるときの処理
    const onUnmount = useCallback(function callback() {
        setMap(null)
    }, []);

  // ----------------------------------------------------
  // D. レンダリング
  // ----------------------------------------------------
  if (loadError) return <div>地図のロード中にエラーが発生しました。</div>;
  if (!isLoaded) return <div>地図を読み込み中...</div>;

  return (
    <div style={{padding: '20px' }}>
      {/* 💡 検索 UI StandaloneSearchBox  */}
      <div style={{ marginBottom: '15px' }}>
        <StandaloneSearchBox
          // SearchBox インスタンスがロードされたときに Ref に格納
          onLoad={(ref) => searchBoxRef.current = ref}
          // ユーザーが候補を選択したときのイベントハンドラ
          onPlacesChanged={onPlacesChanged}
        >
          <input
            type="text"
            placeholder="場所を入力して自動補完を利用..."
            style={{ 
              boxSizing: `border-box`,
              border: `1px solid transparent`,
              width: `100%`,
              height: `40px`,
              padding: `0 12px`,
              borderRadius: `3px`,
              boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
              fontSize: `14px`,
              outline: `none`,
              textOverflow: `ellipses`,
            }}
          />
        </StandaloneSearchBox>
      </div>

      {/* 💡 地図とリストを保持するFlexコンテナ */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Google Map 本体 */}
        <div style={{ flexGrow: 1, height: '85vh', minWidth: 0}}>
        {currentPosition && (
            <GoogleMap
            mapContainerStyle={containerStyle}
            center={currentPosition} // 現在地を中心に設定
            zoom={15}
            onLoad={onLoad} // 地図インスタンスをStateに保存
            onUnmount={onUnmount}
            options={{ zoomControl: true, streetViewControl: false }}
            >
            {/* 1. 現在地のマーカー */}
            <Marker position={currentPosition} label="📍" />
            
            {/* 2. 検索結果のマーカー */}
            {searchResults.map((place) => (
                place.geometry?.location && (
                <Marker 
                    key={place.place_id} 
                    position={place.geometry.location} 
                    title={place.name}
                    onClick={() => setSelectedPlace(place)}
                />
                )
            ))}
            {/* ----------------------------------------------------
                3. 情報ウィンドウ (InfoWindow) の表示
            ---------------------------------------------------- */}
            {selectedPlace && selectedPlace.geometry?.location ? (
                <InfoWindow
                // 選択されたスポットの位置に表示
                position={selectedPlace.geometry.location}
                // 閉じるボタンを押したときの処理
                onCloseClick={() => setSelectedPlace(null)} 
                >
                <div style={{ padding: '5px' }}>
                    {/* スポット名 */}
                    <h3>{selectedPlace.name}</h3>
                    {/* 住所 */}
                    <p>{selectedPlace.vicinity || selectedPlace.formatted_address}</p>
                    {/* 評価があれば表示 */}
                    {selectedPlace.rating && (
                        <p>評価: {selectedPlace.rating} / 5.0 ({selectedPlace.user_ratings_total}件)</p>
                    )}
                    <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.name}&query_place_id=${selectedPlace.place_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#1a73e8', textDecoration: 'none' }}
                    >
                        Googleマップで見る
                    </a>
                </div>
                </InfoWindow>
            ) : null}
            </GoogleMap>
        )}
        {!currentPosition && <div>現在地情報を取得中です...</div>}
        </div>
        {/* 検索結果リスト (新規追加) */}
        <div style={{ width: '300px', flexShrink: 0, height: '85vh', overflowY: 'auto', borderLeft: '1px solid #ccc', paddingLeft: '20px' }}>
          <h2>検索結果 ({searchResults.length} 件)</h2>
          {searchResults.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {searchResults.map((place) => (
                <li 
                  key={place.place_id} 
                  style={{ 
                    padding: '10px', 
                    borderBottom: '1px solid #eee', 
                    cursor: 'pointer', 
                    backgroundColor: selectedPlace?.place_id === place.place_id ? '#e6f7ff' : 'white' 
                  }}
                  // リストアイテムをクリックしたら、地図上のマーカーをクリックしたのと同じ動作をする
                  onClick={() => {
                    setSelectedPlace(place);
                    // 地図をその場所の中心に移動
                    if (place.geometry?.location) {
                       map?.panTo(place.geometry.location);
                    }
                  }}
                >
                  <strong style={{ display: 'block' }}>{place.name}</strong>
                  <small style={{ color: '#555' }}>{place.vicinity || place.formatted_address}</small>
                  {place.rating && (
                    <div style={{ fontSize: '0.9em', color: '#ff9900' }}>
                      ⭐ {place.rating} ({place.user_ratings_total})
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>結果がありません。検索バーで場所を入力してください。</p>
          )}
        </div>
      </div>
    </div>
  );
}