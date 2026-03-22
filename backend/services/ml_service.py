from datetime import datetime
from sklearn.linear_model import LogisticRegression
import numpy as np


class MLService:

    def get_learned_weights(self, events: list[dict]) -> dict:
        X, y = self._build_features(events)

        if len(set(y)) < 2:
            # not enough variety in labels to train yet
            raise ValueError("not enough label variety")

        model = LogisticRegression()
        model.fit(X, y)

        # coefficients correspond to [priority, urgency, hour_of_day]
        coefs = model.coef_[0]
        total = sum(abs(c) for c in coefs) or 1

        return {
            "priority": abs(coefs[0]) / total,
            "urgency": abs(coefs[1]) / total,
            "duration_fit": abs(coefs[2]) / total,
        }

    def _build_features(self, events: list[dict]):
        X = []
        y = []
        for event in events:
            hour = datetime.fromisoformat(event["slot_offered"]).hour
            # placeholder features — real priority/urgency would come from joining with tasks table
            priority_norm = 0.5
            urgency_norm = 0.5
            hour_norm = hour / 23.0

            X.append([priority_norm, urgency_norm, hour_norm])
            y.append(1 if event["action"] == "accepted" else 0)

        return np.array(X), np.array(y)
