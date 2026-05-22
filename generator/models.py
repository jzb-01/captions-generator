from django.db import models

# Create your models here.
class TemporaryTrack(models.Model):
    text = models.CharField(max_length=300, blank=True)
    start_time = models.CharField(max_length=12)
    end_time = models.CharField(max_length=12)
    start_seconds = models.IntegerField()
    end_seconds = models.IntegerField()
    author_id = models.CharField(max_length=100)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['author_id']),
        ]
        ordering = [
            'start_seconds',
            'id'
        ]

    def __str__(self):
        return f"[{self.start_time} -> {self.end_time}] cue: {self.text[:30]}... ({self.author_id})"