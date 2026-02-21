from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import json


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class IngredientType(Enum):
    FLOUR        = "flour"
    SUGAR        = "sugar"
    BUTTER       = "butter"
    STRAWBERRIES = "strawberries"
    CHOCOLATE    = "chocolate"


class PastryType(Enum):
    BREAD           = "bread"
    CROISSANT       = "croissant"
    STRAWBERRY_TART = "strawberry tart"
    CHOCOLATE_CAKE  = "chocolate cake"


class EventType(Enum):
    SAVE          = "save"
    IMPULSE_BUY   = "impulse_buy"
    MINDFUL_BUY   = "mindful_buy"
    RESIST        = "resist"
    BAKE          = "bake"
    INVEST        = "invest"
    PAY_SUPPLIER  = "pay_supplier"
    MISS_PAYMENT  = "miss_payment"
    MISSION_DONE  = "mission_done"
    UPGRADE       = "upgrade"
    NEW_DAY       = "new_day"
    STRESS        = "stress"


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PASTRY_RECIPES: dict[PastryType, dict[IngredientType, int]] = {
    PastryType.BREAD: {IngredientType.FLOUR: 3,  IngredientType.SUGAR: 1},
    PastryType.CROISSANT: {IngredientType.FLOUR: 2,  IngredientType.BUTTER: 2},
    PastryType.STRAWBERRY_TART: {IngredientType.FLOUR: 1,  IngredientType.SUGAR: 2,  IngredientType.STRAWBERRIES: 3},
    PastryType.CHOCOLATE_CAKE: {IngredientType.FLOUR: 2,  IngredientType.SUGAR: 2,  IngredientType.CHOCOLATE: 3},
}

UPGRADE_MILESTONES: list[tuple[int, str]] = [
    (10,  "display_shelf"),
    (50,  "coffee_machine"),
    (100, "storm_insurance"),
    (300, "second_oven"),
]

# (min_score, tier_name, discount_%, unlocked_ingredient)
SUPPLIER_TIERS: list[tuple[int, str, float, Optional[IngredientType]]] = [
    (0,   "Unknown",    0.0,  None),
    (200, "Acquainted", 0.05, None),
    (400, "Trusted",    0.10, IngredientType.CHOCOLATE),
    (600, "Preferred",  0.15, IngredientType.STRAWBERRIES),
    (800, "Partner",    0.20, IngredientType.BUTTER),
]


# ---------------------------------------------------------------------------
# Event Log  (frontend reads this)
# ---------------------------------------------------------------------------

@dataclass
class GameEvent:
    event_type: EventType
    message: str
    emoji: str
    data: dict = field(default_factory=dict)

    def __str__(self):
        return f"{self.emoji}  {self.message}"

    def to_dict(self) -> dict:
        return {
            "type":    self.event_type.value,
            "message": self.message,
            "emoji":   self.emoji,
            "data":    self.data,
        }


# ---------------------------------------------------------------------------
# Sourdough Starter — Investment mechanic (compounding interest)
# ---------------------------------------------------------------------------

@dataclass
class SourdoughStarter:
    balance: float = 0.0
    growth_rate: float = 0.02
    total_earned: float = 0.0

    def feed(self, amount: float) -> GameEvent:
        if amount <= 0:
            return GameEvent(EventType.INVEST, "Feed amount must be positive.", "❌")
        self.balance += amount
        return GameEvent(
            EventType.INVEST,
            f"You fed the starter ${amount:.2f}. It's growing! Total: ${self.balance:.2f}",
            "🌱",
            {"balance": self.balance, "amount": amount},
        )

    def overnight_growth(self) -> tuple[float, GameEvent]:
        earned = round(self.balance * self.growth_rate, 2)
        self.balance += earned
        self.total_earned += earned
        return earned, GameEvent(
            EventType.NEW_DAY,
            f"Starter grew overnight: +${earned:.2f} (compounding at {self.growth_rate*100:.0f}%/day)",
            "📈",
            {"earned": earned, "balance": self.balance},
        )

    def to_dict(self) -> dict:
        return {
            "balance":      round(self.balance, 2),
            "growth_rate":  self.growth_rate,
            "total_earned": round(self.total_earned, 2),
        }


# ---------------------------------------------------------------------------
# Supplier Trust — Credit Score mechanic
# ---------------------------------------------------------------------------

@dataclass
class SupplierTrust:
    score: int = 300          # starts mid-range, like a thin credit file
    pending_payment: float = 0.0
    payments_made: int = 0
    payments_missed: int = 0

    def _get_tier(self) -> tuple:
        current = SUPPLIER_TIERS[0]
        for tier in SUPPLIER_TIERS:
            if self.score >= tier[0]:
                current = tier
        return current

    @property
    def tier_name(self) -> str:
        return self._get_tier()[1]

    @property
    def discount(self) -> float:
        return self._get_tier()[2]

    @property
    def unlocked_ingredient(self) -> Optional[IngredientType]:
        return self._get_tier()[3]

    def add_bill(self, amount: float):
        self.pending_payment += amount

    def pay_bill(self) -> GameEvent:
        if self.pending_payment <= 0:
            return GameEvent(EventType.PAY_SUPPLIER, "No pending supplier bill.", "ℹ️")
        old_tier = self.tier_name
        self.score = min(850, self.score + 20)
        self.payments_made += 1
        self.pending_payment = 0.0
        new_tier = self.tier_name
        tier_changed = new_tier != old_tier
        msg = f"Supplier paid on time! Trust score: {self.score}"
        if tier_changed:
            msg += f" → Tier up: {new_tier}! Better deals unlocked."
        return GameEvent(
            EventType.PAY_SUPPLIER, msg, "🤝",
            {"score": self.score, "tier": new_tier, "tier_changed": tier_changed},
        )

    def miss_bill(self) -> GameEvent:
        self.score = max(300, self.score - 50)
        self.payments_missed += 1
        return GameEvent(
            EventType.MISS_PAYMENT,
            f"Missed supplier payment! Trust score dropped to {self.score}. Prices rising.",
            "📉",
            {"score": self.score, "tier": self.tier_name},
        )

    def to_dict(self) -> dict:
        return {
            "score":           self.score,
            "tier":            self.tier_name,
            "discount":        self.discount,
            "pending_payment": round(self.pending_payment, 2),
            "payments_made":   self.payments_made,
            "payments_missed": self.payments_missed,
        }


# ---------------------------------------------------------------------------
# Mission
# ---------------------------------------------------------------------------

@dataclass
class Mission:
    id: str
    description: str
    reward_ingredient: Optional[IngredientType]
    reward_amount: int
    reward_coins: int
    completed: bool = False

    def complete(self) -> GameEvent:
        if self.completed:
            return GameEvent(EventType.MISSION_DONE, "Already completed.", "ℹ️")
        self.completed = True
        parts = []
        if self.reward_ingredient:
            parts.append(f"+{self.reward_amount} {self.reward_ingredient.value}")
        if self.reward_coins:
            parts.append(f"+{self.reward_coins} coins")
        return GameEvent(
            EventType.MISSION_DONE,
            f"'{self.description}' complete! {', '.join(parts)}",
            "✅",
            {"id": self.id, "rewards": parts},
        )

    def to_dict(self) -> dict:
        return {
            "id":          self.id,
            "description": self.description,
            "reward":      {
                "ingredient": self.reward_ingredient.value if self.reward_ingredient else None,
                "amount":     self.reward_amount,
                "coins":      self.reward_coins,
            },
            "completed": self.completed,
        }


# ---------------------------------------------------------------------------
# Bakery — Core State
# ---------------------------------------------------------------------------

@dataclass
class Bakery:
    name: str = "My Bakery"
    coins: int = 0
    savings: float = 0.0
    day: int = 1
    ingredients: dict = field(default_factory=lambda: {i: 0 for i in IngredientType})
    unlocked_recipes: list = field(default_factory=lambda: [PastryType.BREAD])
    upgrades: list = field(default_factory=list)
    starter: SourdoughStarter = field(default_factory=SourdoughStarter)
    supplier: SupplierTrust = field(default_factory=SupplierTrust)
    customers_today: int = 0
    stress_mode: bool = False
    missions: list = field(default_factory=list)
    event_log: list = field(default_factory=list)

    # ── Internal ─────────────────────────────────────────────────────────────

    def _log(self, event: GameEvent):
        self.event_log.append(event)

    def _check_upgrades(self):
        for cost, name in UPGRADE_MILESTONES:
            if name not in self.upgrades and self.savings >= cost:
                self.upgrades.append(name)
                self._log(GameEvent(
                    EventType.UPGRADE,
                    f"Upgrade unlocked: {name.replace('_', ' ').title()}! (${cost} saved)",
                    "🏪",
                    {"upgrade": name, "cost": cost},
                ))

    def _check_recipe_unlocks(self):
        unlock_map = {
            IngredientType.BUTTER:       PastryType.CROISSANT,
            IngredientType.STRAWBERRIES: PastryType.STRAWBERRY_TART,
            IngredientType.CHOCOLATE:    PastryType.CHOCOLATE_CAKE,
        }
        for ingredient, recipe in unlock_map.items():
            if self.ingredients[ingredient] >= 2 and recipe not in self.unlocked_recipes:
                self.unlocked_recipes.append(recipe)
                self._log(GameEvent(
                    EventType.MISSION_DONE,
                    f"New recipe unlocked: {recipe.value.title()}!",
                    "📖",
                    {"recipe": recipe.value},
                ))

    def _check_stress(self):
        was_stressed = self.stress_mode
        self.stress_mode = (
            self.ingredients[IngredientType.FLOUR] < 3 and self.coins < 10
        )
        if self.stress_mode and not was_stressed:
            self._log(GameEvent(
                EventType.STRESS,
                "Customers have stopped coming. Stabilize plan: "
                "(1) Save $5 today  (2) Skip one takeout  (3) Pay your supplier",
                "⚠️",
                {"stress": True},
            ))

    # ── Finance actions ──────────────────────────────────────────────────────

    def save_money(self, amount: float) -> GameEvent:
        if amount <= 0:
            return GameEvent(EventType.SAVE, "Amount must be positive.", "❌")
        self.savings += amount
        flour_earned = int(amount)
        self.ingredients[IngredientType.FLOUR] += flour_earned
        self.supplier.add_bill(round(amount * 0.1, 2))
        self._check_upgrades()
        self._check_stress()
        event = GameEvent(
            EventType.SAVE,
            f"Saved ${amount:.2f}! +{flour_earned} flour. Total savings: ${self.savings:.2f}",
            "💰",
            {"amount": amount, "flour_earned": flour_earned, "savings": self.savings},
        )
        self._log(event)
        return event

    def log_purchase(self, description: str, amount: float, is_impulse: bool = False) -> GameEvent:
        if amount <= 0:
            return GameEvent(EventType.MINDFUL_BUY, "Amount must be positive.", "❌")
        if is_impulse:
            lost = min(int(amount / 5), self.ingredients[IngredientType.FLOUR])
            self.ingredients[IngredientType.FLOUR] -= lost
            self._check_stress()
            event = GameEvent(
                EventType.IMPULSE_BUY,
                f"A raccoon stole your flour! (${amount:.2f} impulse: {description}) −{lost} flour.",
                "🦝",
                {"amount": amount, "description": description, "flour_lost": lost},
            )
        else:
            coins_earned = int(amount * 0.1)
            self.coins += coins_earned
            event = GameEvent(
                EventType.MINDFUL_BUY,
                f"Mindful purchase: {description} (${amount:.2f}). +{coins_earned} coins.",
                "✔️",
                {"amount": amount, "description": description, "coins_earned": coins_earned},
            )
        self._log(event)
        return event

    def resist_purchase(self, description: str) -> GameEvent:
        self.ingredients[IngredientType.STRAWBERRIES] += 2
        self._check_recipe_unlocks()
        event = GameEvent(
            EventType.RESIST,
            f"You resisted '{description}'! Dough stockpile protected. +2 strawberries.",
            "🛡️",
            {"description": description, "ingredient": "strawberries", "amount": 2},
        )
        self._log(event)
        return event

    # ── Supplier / Credit score ───────────────────────────────────────────────

    def pay_supplier(self) -> GameEvent:
        old_ingredient = self.supplier.unlocked_ingredient
        event = self.supplier.pay_bill()
        new_ingredient = self.supplier.unlocked_ingredient
        if new_ingredient and new_ingredient != old_ingredient and self.ingredients[new_ingredient] == 0:
            self.ingredients[new_ingredient] += 3
            self._log(GameEvent(
                EventType.PAY_SUPPLIER,
                f"Supplier tier reached! Wholesale {new_ingredient.value} deal unlocked. +3 {new_ingredient.value}.",
                "🎁",
                {"ingredient": new_ingredient.value, "amount": 3},
            ))
        self._log(event)
        return event

    def miss_supplier_payment(self) -> GameEvent:
        event = self.supplier.miss_bill()
        self._log(event)
        return event

    # ── Baking ───────────────────────────────────────────────────────────────

    def bake(self, pastry: PastryType) -> GameEvent:
        if pastry not in self.unlocked_recipes:
            return GameEvent(EventType.BAKE, f"{pastry.value} recipe is locked.", "🔒")
        recipe = PASTRY_RECIPES[pastry]
        for ingredient, qty in recipe.items():
            if self.ingredients[ingredient] < qty:
                return GameEvent(
                    EventType.BAKE,
                    f"Not enough {ingredient.value} to bake {pastry.value}.",
                    "❌",
                )
        for ingredient, qty in recipe.items():
            self.ingredients[ingredient] -= qty
        base = 5 + len(self.upgrades) * 2
        bonus = int(base * self.supplier.discount)
        earned = base + bonus
        self.coins += earned
        self.customers_today += 1
        event = GameEvent(
            EventType.BAKE,
            f"Baked {pastry.value}! +{earned} coins (supplier discount: +{bonus}). Customers: {self.customers_today}",
            "🥐",
            {"pastry": pastry.value, "coins_earned": earned, "discount_bonus": bonus, "customers": self.customers_today},
        )
        self._log(event)
        return event

    # ── Missions ─────────────────────────────────────────────────────────────

    def add_mission(self, mission: Mission):
        self.missions.append(mission)

    def complete_mission(self, mission_id: str) -> GameEvent:
        mission = next((m for m in self.missions if m.id == mission_id), None)
        if not mission:
            return GameEvent(EventType.MISSION_DONE, f"Mission '{mission_id}' not found.", "❌")
        event = mission.complete()
        if mission.completed:
            if mission.reward_ingredient:
                self.ingredients[mission.reward_ingredient] += mission.reward_amount
                self._check_recipe_unlocks()
            self.coins += mission.reward_coins
        self._log(event)
        return event

    # ── Investing ────────────────────────────────────────────────────────────

    def invest(self, amount: float) -> GameEvent:
        if self.coins < int(amount):
            return GameEvent(EventType.INVEST, "Not enough coins to invest.", "❌")
        self.coins -= int(amount)
        event = self.starter.feed(amount)
        self._log(event)
        return event

    # ── New Day ──────────────────────────────────────────────────────────────

    def new_day(self) -> list[GameEvent]:
        self.day += 1
        self.customers_today = 0
        events = []

        earned, starter_event = self.starter.overnight_growth()
        self.coins += int(earned)
        self._log(starter_event)
        events.append(starter_event)

        passive = len(self.upgrades) * 2
        if passive > 0:
            self.coins += passive
            e = GameEvent(
                EventType.NEW_DAY,
                f"Passive income from upgrades: +{passive} coins.",
                "🏪",
                {"passive_income": passive},
            )
            self._log(e)
            events.append(e)

        self._check_stress()
        return events

    # ── State export for HTML frontend ──────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "name":             self.name,
            "day":              self.day,
            "coins":            self.coins,
            "savings":          round(self.savings, 2),
            "stress_mode":      self.stress_mode,
            "customers_today":  self.customers_today,
            "upgrades":         self.upgrades,
            "unlocked_recipes": [p.value for p in self.unlocked_recipes],
            "ingredients":      {k.value: v for k, v in self.ingredients.items()},
            "starter":          self.starter.to_dict(),
            "supplier":         self.supplier.to_dict(),
            "missions":         [m.to_dict() for m in self.missions],
            "recent_events":    [e.to_dict() for e in self.event_log[-10:]],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    def status(self) -> str:
        d = self.to_dict()
        return "\n".join([
            f"\n🧁 {d['name']} — Day {d['day']}",
            f"   Coins:    {d['coins']}",
            f"   Savings:  ${d['savings']}",
            f"   Stress:   {'YES ⚠️' if d['stress_mode'] else 'No ✅'}",
            f"   Upgrades: {d['upgrades'] or 'none'}",
            f"   Recipes:  {d['unlocked_recipes']}",
            f"   Pantry:   {d['ingredients']}",
            f"   Starter:  ${d['starter']['balance']} (total earned: ${d['starter']['total_earned']})",
            f"   Supplier: {d['supplier']['tier']} (score: {d['supplier']['score']}, discount: {d['supplier']['discount']*100:.0f}%)",
        ])


# ---------------------------------------------------------------------------
# Default missions factory
# ---------------------------------------------------------------------------

def default_missions() -> list[Mission]:
    return [
        Mission("m1", "No takeout today",         IngredientType.STRAWBERRIES, 2,  0),
        Mission("m2", "Transfer $5 to savings",   IngredientType.BUTTER,       1,  5),
        Mission("m3", "Check your balance",        None,                        0,  3),
        Mission("m4", "Resist one impulse buy",    IngredientType.CHOCOLATE,    1,  0),
        Mission("m5", "Pay your supplier on time", None,                        0, 10),
    ]


# ---------------------------------------------------------------------------
# Demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    bakery = Bakery(name="Penny's Patisserie")
    for m in default_missions():
        bakery.add_mission(m)

    print("=== Day 1: Morning ===")
    print(bakery.save_money(10))
    print(bakery.save_money(50))
    print(bakery.resist_purchase("coffee shop latte"))
    print(bakery.log_purchase("groceries", 30, is_impulse=False))
    print(bakery.log_purchase("impulse Amazon order", 22, is_impulse=True))

    print("\n=== Baking ===")
    print(bakery.bake(PastryType.BREAD))
    print(bakery.bake(PastryType.CROISSANT))

    print("\n=== Missions ===")
    print(bakery.complete_mission("m1"))
    print(bakery.complete_mission("m2"))

    print("\n=== Supplier Payment ===")
    print(bakery.pay_supplier())

    print("\n=== Investing ===")
    print(bakery.invest(20))

    print("\n=== End of Day ===")
    for e in bakery.new_day():
        print(e)

    print(bakery.status())

    print("\n=== JSON State (for frontend) ===")
    print(bakery.to_json())
