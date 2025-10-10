
## Endpoint

### /GET https://pfm.backend.simulator.com/api/v2/partners/current 

Analyze responsive tiles' endpoints 

Below is the expected results I get when I call this endpoint, and I need to ensure that we define 
  * Architecture
  * Api
  * Component
  * Database

* Breakdown the below JSON structure to determine how to map them from this projects layers.


```json
{
    "users": [
        {
            "id": "dpotockitest",
            "custom_tags": [
                "Household",
                "Frogmancometh",
                "Flubbergut.",
                "Boating",
                "Games",
                "Food",
                "Test",
                "Sports"
            ],
            "login": "dpotockitest",
            "email": "donotreply@geezeo.com",
            "login_count": 7589,
            "last_login_at": "2025-10-10T02:54:03.000Z",
            "custom_settings": {
                "financialHealth": {
                    "questions": [
                        100,
                        60,
                        25,
                        75,
                        85,
                        80,
                        50,
                        100
                    ],
                    "scores": {
                        "finHealth": 72,
                        "spend": 80,
                        "save": 50,
                        "borrow": 83,
                        "plan": 75
                    }
                },
                "expenses": {
                    "excluded_tags": [
                        "Transfer",
                        "Bluefin"
                    ]
                }
            },
            "first_name": "beta",
            "last_name": "beta",
            "postal_code": "00000",
            "city": null,
            "state": null,
            "birth_year": 2002,
            "sex": "Female"
        }
    ]
}
```