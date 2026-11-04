from uuid import uuid4
from django.db import models
import uuid


class Candidate(models.Model):
    id = models.UUIDField(primary_key = True , default = uuid4, editable=False )
    name = models.CharField(max_length = 100)
    phone_number = models.CharField(max_length = 15, unique = True)
    email = models.EmailField(blank = True, null = True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name    