from rest_framework import serializers
from .models import TemporaryTrack

class temporary_table_serializer(serializers.ModelSerializer):
    class Meta:
        model = TemporaryTrack
        fields = "__all__"