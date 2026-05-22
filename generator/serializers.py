from rest_framework import serializers
from .models import TemporaryTrack

class temporary_table_serializer(serializers.ModelSerializer):
    class Meta:
        model = TemporaryTrack
        fields = ['id', 'text', 'start_time', 'end_time', 'start_seconds', 'end_seconds', 'author_id']
        read_only_fields = ['author_id']