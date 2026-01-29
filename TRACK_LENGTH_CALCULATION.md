# Track Length Calculation - Delta Time Fix

## 🔴 Vấn đề trước đây

### Tốc độ thực tế vs Track Length không khớp
```
baseSpeed: 3.2-4.0 px/frame (avg ~3.6)
@ 60 FPS với deltaTime = 1.0
=> Tốc độ thực: 3.6 × 60 = 216 px/s

Nhưng trackLength tính:
basePxPerSec = 70 px/s (SAI!)
durationFactor = 1 + (30/90) = 1.33
=> 70 × 1.33 = 93 px/s

30s race:
- Track Length: 30 × 93 = 2,790 px
- Vịt chạy: 216 px/s × 30s = 6,480 px
- Kết quả: Finish sau ~13s thay vì 30s!
```

## ✅ Giải pháp mới

### 1. Tính toán tốc độ thực tế
```javascript
baseSpeed = 3.6 px/frame (average duck speed)
FPS = 60
deltaTime = 1.0 (at 60fps)

Tốc độ raw: 3.6 × 60 = 216 px/s
```

### 2. Rubber-banding effects
```javascript
- Leaders (top 10%): 60% chance slow down → giảm ~20% tốc độ
- Laggers (bottom 50%): 30% chance turbo → tăng ~15% tốc độ
- Average effect: -15% overall speed reduction
```

### 3. Effective speed calculation
```javascript
const baseEffectiveSpeed = 183; // px/s
// 216 × 0.85 (rubber-banding factor) = 183 px/s

// Minor boost for longer races (dynamics)
const durationFactor = Math.min(1.15, 1.0 + (raceDuration / 600));

const pixelsPerSecond = baseEffectiveSpeed × durationFactor;
const trackLength = raceDuration × pixelsPerSecond;
```

## 📊 Ví dụ tính toán

### Race 30 giây
```
baseEffectiveSpeed = 183 px/s
durationFactor = 1.0 + (30/600) = 1.05
pixelsPerSecond = 183 × 1.05 = 192 px/s
trackLength = 30 × 192 = 5,760 px

Verification:
- Vịt chạy ~183 px/s (after rubber-banding)
- 5,760 / 183 ≈ 31.5s (gần đúng với 30s, +5% buffer)
```

### Race 60 giây
```
durationFactor = 1.0 + (60/600) = 1.10
pixelsPerSecond = 183 × 1.10 = 201 px/s
trackLength = 60 × 201 = 12,060 px

Verification:
- 12,060 / 183 ≈ 66s (gần đúng với 60s, +10% buffer)
```

### Race 120 giây
```
durationFactor = 1.0 + (120/600) = 1.15 (capped)
pixelsPerSecond = 183 × 1.15 = 210 px/s
trackLength = 120 × 210 = 25,200 px

Verification:
- 25,200 / 183 ≈ 138s (gần đúng với 120s, +15% buffer)
```

## 🎯 Console Logging

Game giờ log real-time metrics mỗi giây:
```
[Track Setup] Duration: 30s | Speed: 192.2 px/s | Track: 5760px
[1.0s] Leader: Racer #42 | Pos: 215/5760 (3.7%) | Speed: 3.58 px/frame | ETA: 25.2s | Delta: 1.002
[2.0s] Leader: Racer #42 | Pos: 431/5760 (7.5%) | Speed: 3.60 px/frame | ETA: 24.7s | Delta: 0.998
...
[29.5s] Leader: Racer #42 | Pos: 5580/5760 (96.9%) | Speed: 2.10 px/frame | ETA: 1.4s | Delta: 1.001
Winner detected: Racer #42 Position: 5760 TrackLength: 5760
```

## 🔧 Tại sao có buffer (+5-15%)?

1. **Rubber-banding không đều**: Leaders thay đổi → tốc độ dao động
2. **Turbo random**: Một số vịt turbo nhiều hơn → chạy nhanh hơn
3. **Delta time variance**: FPS không ổn định 100%
4. **Deceleration zone**: Vịt chậm lại khi gần finish (200px cuối)

Buffer đảm bảo:
- ✅ Race không kết thúc quá sớm
- ✅ Vẫn có vịt finish gần đúng timer
- ✅ Không có race chạy quá lâu

## 🧪 Testing

Chạy game với các duration khác nhau và check console:
1. Timer countdown: 30s → 0s
2. Leader position: 0px → 5760px
3. ETA: ~30s → 0s
4. Winner detected gần đúng khi timer còn 0-3s

Nếu:
- Finish quá sớm (>5s còn lại): Tăng `baseEffectiveSpeed`
- Finish quá muộn (time's up): Giảm `baseEffectiveSpeed`
- Optimal: ±3s margin
