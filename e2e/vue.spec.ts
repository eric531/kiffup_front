import { test, expect } from '@playwright/test'

test('affiche la page d’accueil', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Votre séjour, réservé avant le concert.')
})

test('redirige un visiteur vers la connexion quand il ouvre le back-office', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/connexion\?redirect=(%2F|\/)admin$/)
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
})
