import { ChangeDetectorRef, Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ApiInterface, LayerOptions, Phenomenon, Platform, SettingsService } from 'helgoland-toolbox';
import { ParameterFilter } from 'helgoland-toolbox/dist/model/api/parameterFilter';
import { ModalController, NavController, ToastController, Slides } from 'ionic-angular';
import { PopoverController } from 'ionic-angular/components/popover/popover-controller';
import * as L from 'leaflet';

import {
  PhenomenonSelectorPopoverComponent,
} from '../../components/phenomenon-selector-popover/phenomenon-selector-popover';
import { StationSelectorComponent } from '../../components/station-selector/station-selector';
import { IrcelineSettingsProvider } from '../../providers/irceline-settings/irceline-settings';
import { MobileSettings } from '../../providers/settings/settings';
import { DiagramPage } from '../diagram/diagram';

const BELGIUM_BBOX: L.LatLngBoundsExpression = [[49.5, 3.27], [51.5, 5.67]];
const FLANDERS_BBOX: L.LatLngBoundsExpression = [[50.6874, 2.5456], [51.5051, 5.9111]];
const BRUSSELS_BBOX: L.LatLngBoundsExpression = [[50.7963, 4.3139], [50.9140, 4.4371]];
const WALLONIA_BBOX: L.LatLngBoundsExpression = [[49.4969, 2.8420], [50.8120, 6.4081]];

@Component({
  selector: 'page-map',
  templateUrl: 'map.html'
})
export class MapPage {

  public lastupdate: Date;

  public providerUrl: string;
  public loading: boolean;
  public phenomenonFilter: ParameterFilter;
  public selectedPhenomenon: Phenomenon;
  public clusterStations: boolean;

  public avoidZoomToSelection = true;
  public overlayMaps: Map<LayerOptions, L.Layer> = new Map<LayerOptions, L.Layer>();
  public fitBounds: L.LatLngBoundsExpression = BRUSSELS_BBOX;
  public layerControlOptions: L.Control.LayersOptions = { position: 'bottomleft', hideSingleBase: true };
  public zoomControlOptions: L.Control.ZoomOptions = {};

  constructor(
    private settingsSrvc: SettingsService<MobileSettings>,
    private nav: NavController,
    private modalCtrl: ModalController,
    private cdr: ChangeDetectorRef,
    private popoverCtrl: PopoverController,
    private ircelineSettings: IrcelineSettingsProvider,
    private api: ApiInterface,
    private toastCtrl: ToastController,
    private translate: TranslateService
  ) {
    const settings = this.settingsSrvc.getSettings();
    this.providerUrl = settings.restApiUrls[0];
    this.clusterStations = settings.clusterStationsOnMap;

    this.ircelineSettings.onLastUpdateChanged.subscribe((lastupdate: Date) => this.lastupdate = lastupdate);

    // this.ircelineSettings.onLastUpdateChanged.subscribe((lastupdate: Date) => {
    //   this.toastCtrl.create({
    //     message: this.translate.instant('map.lastupdate') + ': ' + lastupdate,
    //     duration: 3000
    //   }).present();
    //   this.updateMapOptions(lastupdate);
    // });

    this.ircelineSettings.onTopPollutantTodayChanged.subscribe(pullutantId => {
      this.api.getPhenomenon(pullutantId, this.providerUrl).subscribe(phenomenon => this.setPhenomenon(phenomenon));
    });

    this.updateMapOptions(null);
  }

  private updateMapOptions(time: Date) {
    this.overlayMaps = new Map<LayerOptions, L.Layer>();
    if (time) {
      this.overlayMaps.set({ name: 'pm10_24hmean_1x1', visible: true },
        L.tileLayer.wms('http://geo.irceline.be/rio/wms', {
          layers: 'pm10_hmean_1x1',
          transparent: true,
          format: 'image/png',
          time: '2018-01-05T11:00:00.000Z',
          opacity: 0.7,
          tiled: true,
          visibility: true,
          pane: 'tilePane',
          zIndex: -9998,
          projection: 'EPSG:4326',
          units: 'm'
        })
      );
      this.overlayMaps.set({ name: 'realtime:o3_station_max', visible: true },
        L.tileLayer.wms("http://geo.irceline.be/wms", {
          layers: 'realtime:o3_station_max',
          transparent: true,
          format: 'image/png',
          time: time.toISOString(),
          visibility: false,
          pane: 'tilePane',
          zIndex: -9997,
          projection: 'EPSG:4326',
          units: 'm'
        })
      );
    }
  }

  public slideChanged(slides: Slides) {
    switch (slides.getActiveIndex()) {
      case 1:
      case 5:
        console.log('Belgium');
        this.fitBounds = BELGIUM_BBOX;
        break;
      case 2:
        console.log('Flanders');
        this.fitBounds = FLANDERS_BBOX;
        break;
      case 3:
        console.log('Brussels');
        this.fitBounds = BRUSSELS_BBOX;
        break;
      case 0:
      case 4:
        console.log('Wallonia');
        this.fitBounds = WALLONIA_BBOX;
        break;
      default:
        console.log('undefined');
        break;
    }
  }

  public onStationSelected(platform: Platform) {
    const modal = this.modalCtrl.create(StationSelectorComponent,
      {
        platform,
        providerUrl: this.providerUrl
      }
    );
    modal.onDidDismiss(data => { if (data) { this.nav.push(DiagramPage) } });
    modal.present();
  }

  public onMapLoading(loading: boolean) {
    this.loading = loading;
    this.cdr.detectChanges();
  }

  public openPhenomenonSelector(event: any) {
    const popover = this.popoverCtrl.create(PhenomenonSelectorPopoverComponent, {
      providerUrl: this.providerUrl,
      selectedPhenomenonId: this.selectedPhenomenon ? this.selectedPhenomenon.id : null
    });
    popover.present({
      ev: event
    })
    popover.onDidDismiss((selectedPhenomenon: Phenomenon) => {
      if (selectedPhenomenon) {
        this.setPhenomenon(selectedPhenomenon);
      }
    })
  }

  public test() {
    console.log('clicked map');
  }

  private setPhenomenon(selectedPhenomenon: Phenomenon) {
    console.log(selectedPhenomenon.id + ' ' + selectedPhenomenon.label);
    this.selectedPhenomenon = selectedPhenomenon;
    this.phenomenonFilter = { phenomenon: selectedPhenomenon.id };
  }
}
