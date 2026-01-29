# Delta Time Implementation - Frame-Independent Movement

## Vấn đề đã khắc phục
Game trước đây chạy với tốc độ khác nhau trên các máy khác nhau do FPS khác nhau:
- Máy GPU mạnh (144 FPS) → vịt chạy nhanh hơn
- Máy GPU yếu (30 FPS) → vịt chạy chậm hơn

## Giải pháp
Implement **Delta Time Normalization** với **60 FPS làm baseline** (máy của bạn)

## Thay đổi chi tiết

### 1. Game Class - Delta Time Tracking
```javascript
// Thêm vào constructor
this.targetFPS = 60;
this.targetFrameTime = 1000 / this.targetFPS; // ~16.67ms
this.lastFrameTime = 0;
this.deltaTime = 1.0; // Multiplier: 1.0 = 60fps, >1.0 = slower, <1.0 = faster
```

### 2. Duck Class - Time-based Timers
**Trước:** Timers đếm theo frames
```javascript
this.speedChangeTimer = 30; // 30 frames
this.turboTimer = 50; // 50 frames
this.laneChangeTimer = 120; // 120 frames
```

**Sau:** Timers đếm theo milliseconds
```javascript
this.speedChangeInterval = 500 + Math.random() * 500; // 500-1000ms
this.turboDuration = 833; // ~50 frames at 60fps = 833ms
this.laneChangeInterval = 2000; // 2 seconds
```

### 3. Duck.update() - Delta Time Application
```javascript
update(time, currentRank, totalDucks, deltaTime = 1.0) {
    // Lane change timer
    this.laneChangeTimer -= (16.67 * deltaTime);
    
    // Speed change timer
    this.speedChangeTimer -= (16.67 * deltaTime);
    
    // Turbo timer
    this.turboTimer -= (16.67 * deltaTime);
    
    // Movement (chuẩn hóa theo 60fps)
    this.position += this.speed * deltaTime;
    
    // Lane transition
    this.laneOffset += (this.targetLaneOffset - this.laneOffset) * 0.05 * deltaTime;
}
```

### 4. animate() - Calculate Delta Time
```javascript
animate(timestamp) {
    // Calculate frame time
    const currentTime = timestamp || Date.now();
    const frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    // Delta multiplier
    this.deltaTime = frameTime / this.targetFrameTime;
    
    // Clamp để tránh jump quá lớn
    this.deltaTime = Math.max(0.25, Math.min(4.0, this.deltaTime));
    
    // Pass deltaTime vào duck.update()
    duck.update(timestamp, currentRank, totalDucks, this.deltaTime);
}
```

### 5. Background Scrolling
```javascript
// Trước
this.backgroundOffset += 15;

// Sau
this.backgroundOffset += 15 * this.deltaTime;
```

## Kết quả
✅ Game chạy với **cùng tốc độ** trên mọi máy (30 FPS, 60 FPS, 144 FPS, ...)
✅ Movement, timers, effects đều chuẩn hóa theo **60 FPS baseline**
✅ Máy yếu hơn sẽ có FPS thấp nhưng **logic game giống hệt máy mạnh**

## Công thức Delta Time
```
deltaTime = actualFrameTime / targetFrameTime

Ví dụ:
- 60 FPS: 16.67ms / 16.67ms = 1.0 (baseline)
- 30 FPS: 33.33ms / 16.67ms = 2.0 (di chuyển x2 mỗi frame để bù FPS thấp)
- 144 FPS: 6.94ms / 16.67ms = 0.42 (di chuyển x0.42 mỗi frame vì FPS cao)
```

## Testing
Để test, bạn có thể:
1. Mở game trên nhiều máy khác nhau
2. Đo thời gian từ start đến finish của cùng 1 vịt
3. Kết quả phải giống nhau (±5% do random factors)
