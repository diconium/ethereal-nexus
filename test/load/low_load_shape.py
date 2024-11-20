from locust import LoadTestShape


class LowLoadShape(LoadTestShape):
    time_limit = 600 # 5 minutes time limiet
    increase_delay = 30  # 1 minutes for increase
    increase_size = 10  # number of extra users per increase

    def tick(self):
        run_time = self.get_run_time()

        if run_time < self.time_limit:
            run_time = self.get_run_time()
            step_number = int(run_time / self.increase_delay) + 1
            user_limit = int(step_number * self.increase_size)
            return (user_limit, self.increase_size)

        return None