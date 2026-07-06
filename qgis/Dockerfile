FROM qgis/qgis:latest

COPY requirements.txt .

RUN apt-get update && apt-get install -y python3-pip
RUN pip3 install --no-cache-dir --break-system-packages \
    --ignore-installed typing_extensions -r requirements.txt

WORKDIR /app

ENV QT_QPA_PLATFORM=offscreen
ENV QGIS_PREFIX_PATH=/usr
ENV PYTHONPATH=/usr/share/qgis/python
ENV LD_LIBRARY_PATH=/usr/lib/qgis

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]