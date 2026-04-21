from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class ChatMessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class ChatMessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    created_at: datetime
    sender_id: int
    sender_name: str