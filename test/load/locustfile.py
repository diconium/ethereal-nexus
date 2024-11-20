import os
from locust import HttpUser, task
from low_load_shape import LowLoadShape

class APIEnvironmentComponents(HttpUser):
    def on_start(self):
        key = f"apikey {os.environ["AUTH_API_KEY"]}"
        self.client.headers = {'Authorization': key}

    @task
    def hello_world(self):
        self.client.get("/api/v1/environments/7991c483-77bc-41a2-ba88-1a07423e52d2/components/image-text")
