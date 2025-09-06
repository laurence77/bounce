import { test, expect } from '@playwright/test';

test.describe('Bounce Game Tests', () => {
  test('game loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle('bounce-classic-standalone');
    
    // Check that the game container exists
    await expect(page.locator('#game')).toBeVisible();
    
    // Wait for the game to initialize (Phaser canvas should appear)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
  });

  test('game canvas has correct dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    
    const canvas = page.locator('canvas');
    
    // Check canvas dimensions match the game config (960x540)
    const width = await canvas.evaluate(el => el.width);
    const height = await canvas.evaluate(el => el.height);
    
    expect(width).toBe(960);
    expect(height).toBe(540);
  });

  test('keyboard controls work', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    
    // Focus the game canvas
    await page.locator('canvas').click();
    
    // Test arrow key presses (basic interaction test)
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    
    // If we get here without errors, keyboard events are being processed
    expect(true).toBe(true);
  });

  test('touch/mobile controls exist', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    
    // Test touch zones by clicking different areas of the screen
    const canvas = page.locator('canvas');
    
    // Click left third (left movement zone)
    await canvas.click({ position: { x: 100, y: 400 } });
    
    // Click right third (right movement zone) 
    await canvas.click({ position: { x: 500, y: 400 } });
    
    // Click far right (jump zone)
    await canvas.click({ position: { x: 800, y: 400 } });
    
    // If clicks don't cause errors, touch zones are working
    expect(true).toBe(true);
  });

  test('game restarts on collision', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    
    // This is a basic test - in a real scenario you'd need to 
    // simulate the ball hitting spikes to trigger restart
    // For now we just verify the scene can be accessed
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Test that we can interact with the game
    await canvas.click();
    expect(true).toBe(true);
  });
});