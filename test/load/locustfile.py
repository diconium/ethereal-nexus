from locust import HttpUser, task
from low_load_shape import LowLoadShape

class APIEnvironmentComponents(HttpUser):
    def on_start(self):
        self.client.headers = {'Authorization': 'apikey 0f47f01a-543a-4358-aebf-b6b7f28538ef'}

    @task
    def hello_world(self):
        self.client.get("/api/v1/environments/7991c483-77bc-41a2-ba88-1a07423e52d2/components/image-text")
