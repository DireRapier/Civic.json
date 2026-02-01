from playwright.sync_api import sync_playwright

def verify_identity_intelligence():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.on("dialog", lambda dialog: dialog.accept())

        # Clean slate
        page.goto("http://localhost:8000/index.html")
        page.evaluate("localStorage.removeItem('civicData');")
        page.reload()

        # 1. Verify Default Metrics (Empty)
        print("1. Verifying Default Metrics...")
        page.wait_for_selector(".key-metrics")
        metrics_text = page.locator(".key-metrics").text_content()
        assert "Pop: 0" in metrics_text
        assert "Water: 0 L" in metrics_text
        assert "Medics: 0" in metrics_text
        print("Default Metrics Verified.")

        # 2. Add Medic Person
        print("2. Adding Medic...")
        page.click("a[href='people.html']")
        page.wait_for_url("**/people.html")
        page.click("#add-person-btn")
        page.fill("#person-name", "Doc Holiday")
        page.fill("#person-age", "50")
        page.select_option("#person-gender", "Male")
        page.fill("#person-skill", "Chief Medic")
        page.select_option("#person-health", "Healthy")
        page.click("#btn-save-person")

        # Verify Metrics Update (Header is shared)
        metrics_text = page.locator(".key-metrics").text_content()
        assert "Pop: 1" in metrics_text
        assert "Medics: 1" in metrics_text
        print("Medic Metric Verified.")

        # 3. Add Water Resource
        print("3. Adding Water...")
        page.click("a[href='index.html']")
        page.wait_for_url("**/index.html")
        page.click("#admin-toggle")
        page.select_option("#input-type", "Water")
        page.fill("#input-location", "Tank 1")
        page.fill("#input-quantity", "10 Gallons")
        page.select_option("#input-status", "Good")
        page.click("#resource-form button[type='submit']")

        # Verify Water Metric (10 * 3.78 = 37.8 -> rounded 38 L)
        metrics_text = page.locator(".key-metrics").text_content()
        # "38 L" or "37 L"? toFixed(0) rounds. 37.8 rounds to 38.
        assert "Water: 38 L" in metrics_text
        print("Water Metric Verified.")

        # 4. Governance Settings
        print("4. Testing Governance...")
        page.click("#settings-trigger")
        page.fill("#gov-name", "Resilience Valley")
        page.click("#governance-form button[type='submit']")

        # Verify Brand Update
        brand_text = page.locator("#app-brand").text_content()
        assert "Resilience Valley" in brand_text

        # Reload to verify persistence
        page.reload()
        brand_text_reloaded = page.locator("#app-brand").text_content()
        assert "Resilience Valley" in brand_text_reloaded
        print("Governance Identity Verified.")

        page.screenshot(path="verification_phase14.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_identity_intelligence()
