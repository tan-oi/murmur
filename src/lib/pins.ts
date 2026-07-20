// client-side shape of a pin — matches what getPins/uploadPin return
export type SoundPin = {
  id: string;
  lng: number;
  lat: number;
  audioUrl: string;
  createdAt: Date | string;
};
