// Web Worker for processing duck physics/positions
// Handles batch updates for large duck counts

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    if (type === 'UPDATE_DUCKS') {
        const {
            ducks,
            deltaTime,
            trackLength,
            rankings,
            timestamp,
            cameraOffset,
            viewportWidth,
            viewportBuffer
        } = data;
        
        // Update each duck's position and state
        const updatedDucks = ducks.map((duck, index) => {
            // Skip if finished
            if (duck.finished) return duck;
            
            // Viewport culling - only update visible + nearby ducks
            const viewportStart = cameraOffset - viewportBuffer;
            const viewportEnd = cameraOffset + viewportWidth + viewportBuffer;
            const isNearViewport = duck.position >= viewportStart - 500 && duck.position <= viewportEnd + 500;
            
            // Update rank
            const currentRank = rankings ? (rankings.findIndex(d => d.id === duck.id) + 1 || ducks.length) : index + 1;
            
            // Lightweight update for far ducks
            if (!isNearViewport) {
                return {
                    ...duck,
                    position: duck.position + (duck.speed || duck.baseSpeed) * deltaTime
                };
            }
            
            // Full update for visible ducks
            // Lane changing
            duck.laneChangeTimer = (duck.laneChangeTimer || 0) - (16.67 * deltaTime);
            if (duck.laneChangeTimer <= 0 && Math.random() > 0.85) {
                duck.laneChangeTimer = 2000 + (Math.random() * 2000);
                duck.targetLaneOffset = (Math.random() - 0.5) * 40;
            }
            duck.laneOffset = duck.laneOffset + ((duck.targetLaneOffset || 0) - (duck.laneOffset || 0)) * 0.05 * deltaTime;
            
            // Animation frame update
            const currentTime = timestamp;
            const frameInterval = 1000 / 12; // 12 FPS animation
            if (currentTime - (duck.lastFrameTime || 0) >= frameInterval) {
                duck.lastFrameTime = currentTime;
                duck.currentFrame = ((duck.currentFrame || 0) + 1) % 3;
            }
            
            // Speed changes
            duck.speedChangeTimer = (duck.speedChangeTimer || 0) - (16.67 * deltaTime);
            if (duck.speedChangeTimer <= 0) {
                duck.speedChangeTimer = 500 + Math.random() * 500;
                
                const isLeader = currentRank === 1;
                const isTop3 = currentRank <= 3;
                const isLagging = currentRank > ducks.length * 0.5;
                
                const slowDownChance = isLeader ? 0.60 : isTop3 ? 0.45 : 0.10;
                const turboChance = isLeader ? 0.95 : isTop3 ? 0.85 : isLagging ? 0.70 : 0.80;
                
                const rand = Math.random();
                
                if (rand > turboChance) {
                    const boostMultiplier = isLagging ? 1.8 : 1.4;
                    duck.targetSpeed = duck.maxSpeed * (boostMultiplier + Math.random() * 0.5);
                    duck.turboActive = true;
                    duck.turboTimer = 833;
                } else if (rand > 0.60) {
                    duck.targetSpeed = duck.baseSpeed * (1.5 + Math.random() * 0.7);
                } else if (rand < slowDownChance) {
                    const slowMultiplier = isLeader ? 0.2 : isTop3 ? 0.4 : 0.6;
                    duck.targetSpeed = duck.minSpeed * (slowMultiplier + Math.random() * 0.2);
                } else {
                    duck.targetSpeed = duck.baseSpeed * (0.7 + Math.random() * 0.6);
                }
            }
            
            // Turbo timer
            if (duck.turboActive) {
                duck.turboTimer = (duck.turboTimer || 0) - (16.67 * deltaTime);
                if (duck.turboTimer <= 0) {
                    duck.turboActive = false;
                }
            }
            
            // Deceleration near finish
            const distanceToFinish = trackLength - 75 - duck.position;
            if (distanceToFinish <= 50 && distanceToFinish > 0) {
                const slowdownFactor = distanceToFinish / 50;
                duck.targetSpeed = duck.baseSpeed * slowdownFactor * 0.5;
            }
            
            // Update speed and position
            const acceleration = ((duck.targetSpeed || duck.baseSpeed) - duck.speed) * 0.05;
            duck.speed = duck.speed + acceleration;
            duck.speed = Math.max(duck.minSpeed, Math.min(duck.maxSpeed * 1.7, duck.speed));
            
            duck.position = duck.position + (duck.speed + (Math.random() - 0.5) * 0.3) * deltaTime;
            
            return duck;
        });
        
        // Send updated ducks back
        self.postMessage({
            type: 'DUCKS_UPDATED',
            ducks: updatedDucks
        });
    }
};
