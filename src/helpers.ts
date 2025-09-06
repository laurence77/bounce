export const WIDTH = 960;
export const HEIGHT = 540;
export const GRAVITY_Y = 1200;

export function accelerate(current:number, target:number, factor:number){
  return current + (target - current) * factor;
}

export class JumpLogic {
  onGround = false;
  coyoteTimer = 0;
  inputBuffer = 0;
  tryJump(vy:number, impulse:number){
    if (this.onGround && this.inputBuffer > 0){
      this.onGround = false;
      this.inputBuffer = 0;
      return -Math.abs(impulse);
    }
    return vy;
  }
}
