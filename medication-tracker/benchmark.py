import requests
import time
import statistics
import json
from datetime import datetime
import sys
import asyncio
import aiohttp
from pathlib import Path

class PerformanceBenchmark:
    def __init__(self):
        self.backend_url = "http://localhost:5000"
        self.frontend_url = "http://localhost:3000"
        self.results_dir = Path("benchmark_results")
        self.results_dir.mkdir(exist_ok=True)
        
    async def measure_response_time(self, session, url, name):
        try:
            start_time = time.time()
            async with session.get(url) as response:
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                return {
                    'endpoint': name,
                    'status': response.status,
                    'response_time': response_time
                }
        except Exception as e:
            return {
                'endpoint': name,
                'status': 'error',
                'error': str(e)
            }

    async def run_load_test(self, endpoint, requests_count=100):
        async with aiohttp.ClientSession() as session:
            tasks = []
            for _ in range(requests_count):
                task = self.measure_response_time(session, endpoint['url'], endpoint['name'])
                tasks.append(task)
            return await asyncio.gather(*tasks)

    def analyze_results(self, results):
        response_times = [r['response_time'] for r in results if isinstance(r.get('response_time'), (int, float))]
        if not response_times:
            return {
                'min': 0,
                'max': 0,
                'avg': 0,
                'median': 0,
                'p95': 0,
                'success_rate': 0
            }

        success_count = len([r for r in results if r.get('status') == 200])
        
        return {
            'min': min(response_times),
            'max': max(response_times),
            'avg': statistics.mean(response_times),
            'median': statistics.median(response_times),
            'p95': statistics.quantiles(response_times, n=20)[-1],
            'success_rate': (success_count / len(results)) * 100
        }

    async def run_benchmark(self):
        print("🚀 Starting Performance Benchmark")
        print("=" * 50)

        endpoints = [
            {'name': 'Backend Health', 'url': f"{self.backend_url}/health"},
            {'name': 'Frontend Load', 'url': self.frontend_url},
            # Add more endpoints specific to your application
            {'name': 'API Medications', 'url': f"{self.backend_url}/api/medications"},
            {'name': 'API Schedule', 'url': f"{self.backend_url}/api/schedule"}
        ]

        all_results = {}
        
        for endpoint in endpoints:
            print(f"\n📊 Testing {endpoint['name']}...")
            results = await self.run_load_test(endpoint)
            analysis = self.analyze_results(results)
            all_results[endpoint['name']] = analysis
            
            print(f"  Min Response Time: {analysis['min']:.2f}ms")
            print(f"  Max Response Time: {analysis['max']:.2f}ms")
            print(f"  Average Response Time: {analysis['avg']:.2f}ms")
            print(f"  95th Percentile: {analysis['p95']:.2f}ms")
            print(f"  Success Rate: {analysis['success_rate']:.1f}%")

        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = self.results_dir / f"benchmark_{timestamp}.json"
        with open(result_file, 'w') as f:
            json.dump(all_results, f, indent=2)
        
        print(f"\n✅ Benchmark complete! Results saved to {result_file}")
        return all_results

    def compare_with_previous(self, current_results):
        previous_results = list(self.results_dir.glob("benchmark_*.json"))
        if not previous_results:
            return
        
        latest_previous = max(previous_results, key=lambda x: x.name)
        with open(latest_previous) as f:
            previous_data = json.load(f)

        print("\n📈 Performance Comparison with Previous Benchmark")
        print("=" * 50)
        
        for endpoint in current_results:
            if endpoint in previous_data:
                curr = current_results[endpoint]
                prev = previous_data[endpoint]
                avg_change = ((curr['avg'] - prev['avg']) / prev['avg']) * 100
                
                print(f"\n{endpoint}:")
                print(f"  Average Response Time Change: {avg_change:+.1f}%")
                if abs(avg_change) > 10:
                    print("  ⚠️ Significant performance change detected!")

def main():
    benchmark = PerformanceBenchmark()
    try:
        results = asyncio.run(benchmark.run_benchmark())
        benchmark.compare_with_previous(results)
    except KeyboardInterrupt:
        print("\n⚠️ Benchmark interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during benchmark: {str(e)}")
    finally:
        print("\nPress Enter to exit...")
        input()

if __name__ == "__main__":
    main()
