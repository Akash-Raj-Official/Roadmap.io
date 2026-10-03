import { test, expect } from "@playwright/test";

test("landing page renders tracks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /learning, mapped like a trail/i })).toBeVisible();
});

test("learner can sign up and reach dashboard", async ({ page }) => {
  const email = `learner-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Test Learner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("public track page is read-only for signed-out visitors", async ({ page }) => {
  await page.goto("/tracks/devops");
  await expect(page.getByRole("heading", { name: "DevOps" })).toBeVisible();
  await expect(page.getByText(/create an account/i)).toBeVisible();
});
