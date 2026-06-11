import uuid
import random
from locust import HttpUser, task, between

class LMSUser(HttpUser):
    # Simulate a user thinking for 1 to 5 seconds between actions
    wait_time = between(1, 5)

    def on_start(self):
        """Runs when a simulated user starts. Performs registration and login."""
        self.username = f"load_user_{uuid.uuid4().hex[:10]}@test.com"
        self.password = "Secr3tP@ssw0rd!"
        self.auth_headers = {}
        self.module_ids = []
        
        self.register_and_login()

    def register_and_login(self):
        # 1. Register user
        reg_payload = {
            "email": self.username,
            "password": self.password,
            "first_name": "Load",
            "last_name": "Tester",
            "year": random.choice([1, 2, 3, 4])
        }
        
        with self.client.post("/api/v1/auth/register", json=reg_payload, catch_response=True) as resp:
            if resp.status_code in [200, 201]:
                resp.success()
            elif resp.status_code == 400 and "already registered" in resp.text:
                resp.success()  # Already exists, we can log in
            else:
                resp.failure(f"Registration failed: {resp.status_code} - {resp.text}")
                return

        # 2. Login user
        login_payload = {
            "email": self.username,
            "password": self.password
        }
        
        with self.client.post("/api/v1/auth/login", json=login_payload, catch_response=True) as resp:
            if resp.status_code == 200:
                token_data = resp.json()
                token = token_data.get("access_token")
                self.auth_headers = {"Authorization": f"Bearer {token}"}
                resp.success()
            else:
                resp.failure(f"Login failed: {resp.status_code} - {resp.text}")

    @task(5)
    def view_modules(self):
        """Simulate viewing modules (cached)"""
        if not self.auth_headers:
            return
            
        with self.client.get("/api/v1/modules", headers=self.auth_headers, catch_response=True) as resp:
            if resp.status_code == 200:
                try:
                    modules = resp.json()
                    self.module_ids = [m["module_id"] for m in modules if "module_id" in m]
                    resp.success()
                except Exception as exc:
                    resp.failure(f"Failed to parse modules JSON: {exc}")
            else:
                resp.failure(f"Failed to view modules: {resp.status_code}")

    @task(3)
    def view_module_details(self):
        """Simulate viewing a single module's details if we have cached IDs"""
        if not self.auth_headers or not self.module_ids:
            return
            
        target_id = random.choice(self.module_ids)
        with self.client.get(f"/api/v1/modules/{target_id}", headers=self.auth_headers, catch_response=True) as resp:
            if resp.status_code in [200, 404]:
                resp.success()
            else:
                resp.failure(f"Failed to get module details for {target_id}: {resp.status_code}")

    @task(4)
    def view_progress(self):
        """Simulate viewing learning progress"""
        if not self.auth_headers:
            return
            
        with self.client.get("/api/v1/auth/student/progress", headers=self.auth_headers, catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Failed to view progress: {resp.status_code}")

    @task(1)
    def chat_interview(self):
        """Simulate sending a message to the public AI interview endpoint"""
        # Endpoint is public, does not require headers
        chat_payload = {
            "session_id": str(uuid.uuid4()),
            "history": [
                {"role": "user", "text": "Hi"}
            ],
            "message": "Hello, I would like to start my practice interview for a Software Engineer role.",
            "interview_setup": {
                "role_name": "Software Engineer",
                "difficulty": "medium",
                "topics": ["Python", "Algorithms"]
            }
        }
        
        with self.client.post("/api/v1/chat", json=chat_payload, catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 502 and "groq" in resp.text.lower():
                # Allow Groq network / limit errors as success for load testing since it's an upstream provider
                resp.success()
            else:
                resp.failure(f"Chat failed: {resp.status_code} - {resp.text}")

    @task(1)
    def generate_email_ai(self):
        """Simulate requesting email generation from AI tools"""
        if not self.auth_headers:
            return
            
        email_payload = {
            "email_prompt": "Request a follow-up on my application for the Web Developer position.",
            "tone": "professional",
            "recipient_name": "Hiring Manager",
            "company_name": "Aao Seekhe Inc",
            "purpose": "job follow-up",
            "sender_name": "Load Tester",
            "sender_email": self.username
        }
        
        with self.client.post("/api/v1/email/generate", json=email_payload, headers=self.auth_headers, catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 502 and "groq" in resp.text.lower():
                resp.success()  # Upstream provider error allowed during load testing
            else:
                resp.failure(f"Email generation failed: {resp.status_code} - {resp.text}")
