import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError, BehaviorSubject, from } from 'rxjs';

import { PlayerManagementComponent } from './player-management.component';
import { PlayerService } from '../../services/player.service';
import { Player } from '../../models/player.model';

describe('PlayerManagementComponent', () => {
  let component: PlayerManagementComponent;
  let fixture: ComponentFixture<PlayerManagementComponent>;
  let mockPlayerService: jasmine.SpyObj<PlayerService>;
  let playersSubject: BehaviorSubject<Player[]>;
  let loadingSubject: BehaviorSubject<boolean>;
  let minimumPlayersSubject: BehaviorSubject<boolean>;

  const mockPlayers: Player[] = [
    {
      id: 'player1',
      name: 'John Doe',
      isActive: true,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'player2',
      name: 'Jane Smith',
      isActive: true,
      createdAt: new Date('2024-01-02'),
    },
    {
      id: 'player3',
      name: 'Bob Johnson',
      isActive: false,
      createdAt: new Date('2024-01-03'),
    },
  ];

  beforeEach(async () => {
    playersSubject = new BehaviorSubject<Player[]>(mockPlayers);
    loadingSubject = new BehaviorSubject<boolean>(false);
    minimumPlayersSubject = new BehaviorSubject<boolean>(false);

    const playerServiceSpy = jasmine.createSpyObj('PlayerService', [
      'getPlayers',
      'getLoadingState',
      'hasMinimumPlayers',
      'addPlayer',
      'updatePlayer',
      'deletePlayer',
    ]);

    playerServiceSpy.getPlayers.and.returnValue(playersSubject.asObservable());
    playerServiceSpy.getLoadingState.and.returnValue(
      loadingSubject.asObservable()
    );
    playerServiceSpy.hasMinimumPlayers.and.returnValue(
      minimumPlayersSubject.asObservable()
    );

    await TestBed.configureTestingModule({
      imports: [PlayerManagementComponent, ReactiveFormsModule],
      providers: [{ provide: PlayerService, useValue: playerServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerManagementComponent);
    component = fixture.componentInstance;
    mockPlayerService = TestBed.inject(
      PlayerService
    ) as jasmine.SpyObj<PlayerService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize form with empty values', () => {
      expect(component.playerForm).toBeDefined();
      expect(component.playerForm.get('name')?.value).toBe('');
    });

    it('should have required validator on name field', () => {
      const nameControl = component.playerForm.get('name');
      nameControl?.setValue('');
      expect(nameControl?.hasError('required')).toBeTruthy();
    });

    it('should have minlength validator on name field', () => {
      const nameControl = component.playerForm.get('name');
      nameControl?.setValue('A');
      expect(nameControl?.hasError('minlength')).toBeTruthy();
    });

    it('should have maxlength validator on name field', () => {
      const nameControl = component.playerForm.get('name');
      nameControl?.setValue('A'.repeat(51));
      expect(nameControl?.hasError('maxlength')).toBeTruthy();
    });

    it('should initialize with no editing player', () => {
      expect(component.editingPlayer).toBeNull();
    });

    it('should initialize observables from service', () => {
      expect(component.players$).toBeDefined();
      expect(component.isLoading$).toBeDefined();
      expect(component.hasMinimumPlayers$).toBeDefined();
    });
  });

  describe('Form Submission - Add Player', () => {
    it('should not submit if form is invalid', async () => {
      component.playerForm.patchValue({ name: '' });

      await component.onSubmit();

      expect(mockPlayerService.addPlayer).not.toHaveBeenCalled();
      expect(component.playerForm.get('name')?.touched).toBeTruthy();
    });

    it('should add player successfully', async () => {
      const newPlayer: Player = {
        id: 'player4',
        name: 'New Player',
        isActive: true,
        createdAt: new Date(),
      };

      mockPlayerService.addPlayer.and.returnValue(of(newPlayer));
      component.playerForm.patchValue({ name: 'New Player' });

      await component.onSubmit();

      expect(mockPlayerService.addPlayer).toHaveBeenCalledWith({
        name: 'New Player',
      });
      expect(component.successMessage).toContain('New Player');
      expect(component.playerForm.get('name')?.value).toBeNull();
    });

    it('should handle add player error', async () => {
      mockPlayerService.addPlayer.and.returnValue(
        throwError(
          () => new Error('Player with name "Duplicate" already exists')
        )
      );
      component.playerForm.patchValue({ name: 'Duplicate' });

      await component.onSubmit();

      expect(component.errorMessage).toContain('already exists');
    });

    it('should set loading state during submission', async () => {
      let resolveAdd: (value: any) => void;
      const addPromise = new Promise<Player>((resolve) => {
        resolveAdd = resolve;
      });
      mockPlayerService.addPlayer.and.returnValue(from(addPromise));

      component.playerForm.patchValue({ name: 'Test Player' });

      const submitPromise = component.onSubmit();
      expect(component.isSubmitting).toBeTruthy();

      resolveAdd!({
        id: 'test',
        name: 'Test Player',
        isActive: true,
        createdAt: new Date(),
      });
      await submitPromise;
      expect(component.isSubmitting).toBeFalsy();
    });
  });

  describe('Form Submission - Update Player', () => {
    beforeEach(() => {
      component.editingPlayer = mockPlayers[0];
      component.playerForm.patchValue({ name: 'Updated Name' });
    });

    it('should update player successfully', async () => {
      const updatedPlayer: Player = {
        ...mockPlayers[0],
        name: 'Updated Name',
      };

      mockPlayerService.updatePlayer.and.returnValue(of(updatedPlayer));

      await component.onSubmit();

      expect(mockPlayerService.updatePlayer).toHaveBeenCalledWith('player1', {
        name: 'Updated Name',
      });
      expect(component.successMessage).toContain('Updated Name');
      expect(component.editingPlayer).toBeNull();
    });

    it('should handle update player error', async () => {
      mockPlayerService.updatePlayer.and.returnValue(
        throwError(() => new Error('Validation failed'))
      );

      await component.onSubmit();

      expect(component.errorMessage).toContain('check your input');
    });
  });

  describe('Player Management Actions', () => {
    it('should start editing a player', () => {
      const player = mockPlayers[0];

      component.editPlayer(player);

      expect(component.editingPlayer).toBe(player);
      expect(component.playerForm.get('name')?.value).toBe(player.name);
      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe('');
    });

    it('should cancel editing', () => {
      component.editingPlayer = mockPlayers[0];
      component.playerForm.patchValue({ name: 'Some Name' });
      component.errorMessage = 'Some error';

      component.cancelEdit();

      expect(component.editingPlayer).toBeNull();
      expect(component.playerForm.get('name')?.value).toBeNull();
      expect(component.errorMessage).toBe('');
    });

    it('should show delete confirmation', () => {
      const player = mockPlayers[0];

      component.confirmDelete(player);

      expect(component.playerToDelete).toBe(player);
      expect(component.showDeleteConfirm).toBeTruthy();
    });

    it('should cancel delete confirmation', () => {
      component.playerToDelete = mockPlayers[0];
      component.showDeleteConfirm = true;

      component.cancelDelete();

      expect(component.playerToDelete).toBeNull();
      expect(component.showDeleteConfirm).toBeFalsy();
    });

    it('should delete player successfully', async () => {
      component.playerToDelete = mockPlayers[0];
      component.showDeleteConfirm = true;
      mockPlayerService.deletePlayer.and.returnValue(of(undefined));

      await component.deletePlayer();

      expect(mockPlayerService.deletePlayer).toHaveBeenCalledWith('player1');
      expect(component.successMessage).toContain('John Doe');
      expect(component.playerToDelete).toBeNull();
      expect(component.showDeleteConfirm).toBeFalsy();
    });

    it('should handle delete player error', async () => {
      component.playerToDelete = mockPlayers[0];
      mockPlayerService.deletePlayer.and.returnValue(
        throwError(() => new Error('Player ID is required'))
      );

      await component.deletePlayer();

      expect(component.errorMessage).toContain('Invalid player selected');
      expect(component.playerToDelete).toBeNull();
      expect(component.showDeleteConfirm).toBeFalsy();
    });

    it('should not delete if no player selected', async () => {
      component.playerToDelete = null;

      await component.deletePlayer();

      expect(mockPlayerService.deletePlayer).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    const errorTestCases = [
      {
        error: new Error('Player with name "Test" already exists'),
        expectedMessage: 'already exists',
      },
      {
        error: new Error('Validation failed: Name is required'),
        expectedMessage: 'check your input',
      },
      {
        error: new Error('Player ID is required'),
        expectedMessage: 'Invalid player selected',
      },
      {
        error: new Error('Network error'),
        expectedMessage: 'check your connection',
      },
    ];

    errorTestCases.forEach(({ error, expectedMessage }) => {
      it(`should handle error: ${error.message}`, async () => {
        mockPlayerService.addPlayer.and.returnValue(throwError(() => error));
        component.playerForm.patchValue({ name: 'Test Player' });

        await component.onSubmit();

        expect(component.errorMessage).toContain(expectedMessage);
      });
    });
  });

  describe('Validation Helper Methods', () => {
    it('should correctly identify invalid fields', () => {
      const nameControl = component.playerForm.get('name');
      nameControl?.setValue('');
      nameControl?.markAsTouched();

      expect(component.isFieldInvalid('name')).toBeTruthy();

      nameControl?.setValue('Valid Name');
      expect(component.isFieldInvalid('name')).toBeFalsy();
    });

    it('should return appropriate error messages', () => {
      const nameControl = component.playerForm.get('name');

      nameControl?.setValue('');
      nameControl?.markAsTouched();
      expect(component.getFieldError('name')).toBe('Player name is required');

      nameControl?.setValue('A');
      expect(component.getFieldError('name')).toBe(
        'Player name must be at least 2 characters long'
      );

      nameControl?.setValue('A'.repeat(51));
      expect(component.getFieldError('name')).toBe(
        'Player name cannot exceed 50 characters'
      );

      nameControl?.setValue('Valid Name');
      expect(component.getFieldError('name')).toBe('');
    });
  });

  describe('Helper Methods', () => {
    it('should get active players count', () => {
      const count = component.getActivePlayersCount(mockPlayers);
      expect(count).toBe(2); // Only player1 and player2 are active
    });

    it('should check if player is active', () => {
      expect(component.isPlayerActive(mockPlayers[0])).toBeTruthy();
      expect(component.isPlayerActive(mockPlayers[2])).toBeFalsy();
    });

    it('should provide trackBy function', () => {
      const result = component.trackByPlayerId(0, mockPlayers[0]);
      expect(result).toBe('player1');
    });
  });

  describe('Form Getters', () => {
    it('should provide access to name control', () => {
      expect(component.name).toBe(component.playerForm.get('name'));
    });
  });

  describe('Template Integration', () => {
    it('should display players statistics', () => {
      playersSubject.next(mockPlayers);
      fixture.detectChanges();

      const statCards = fixture.nativeElement.querySelectorAll('.stat-card');
      expect(statCards.length).toBe(3);
    });

    it('should display success message when present', () => {
      component.successMessage = 'Test success message';
      fixture.detectChanges();

      const successAlert =
        fixture.nativeElement.querySelector('.alert-success');
      expect(successAlert?.textContent.trim()).toBe('Test success message');
    });

    it('should display error message when present', () => {
      component.errorMessage = 'Test error message';
      fixture.detectChanges();

      const errorAlert = fixture.nativeElement.querySelector('.alert-error');
      expect(errorAlert?.textContent.trim()).toBe('Test error message');
    });

    it('should disable submit button when form is invalid', () => {
      component.playerForm.patchValue({ name: '' });
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector(
        'button[type="submit"]'
      );
      expect(submitButton?.disabled).toBeTruthy();
    });

    it('should disable submit button when submitting', () => {
      component.isSubmitting = true;
      component.playerForm.patchValue({ name: 'Valid Name' });
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector(
        'button[type="submit"]'
      );
      expect(submitButton?.disabled).toBeTruthy();
    });

    it('should show loading state', () => {
      loadingSubject.next(true);
      fixture.detectChanges();

      const loadingContainer =
        fixture.nativeElement.querySelector('.loading-container');
      expect(loadingContainer).toBeTruthy();
    });

    it('should show empty state when no players', () => {
      playersSubject.next([]);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });

    it('should show minimum players warning', () => {
      minimumPlayersSubject.next(false);
      fixture.detectChanges();

      const warningSection =
        fixture.nativeElement.querySelector('.warning-section');
      expect(warningSection).toBeTruthy();
    });

    it('should show delete confirmation modal', () => {
      component.showDeleteConfirm = true;
      component.playerToDelete = mockPlayers[0];
      fixture.detectChanges();

      const modal = fixture.nativeElement.querySelector('.modal-overlay');
      expect(modal).toBeTruthy();
    });

    it('should display edit mode correctly', () => {
      component.editingPlayer = mockPlayers[0];
      fixture.detectChanges();

      const formHeader = fixture.nativeElement.querySelector('.form-header h2');
      expect(formHeader?.textContent).toContain('Edit Player');

      const cancelButton = fixture.nativeElement.querySelector(
        '.form-header .btn-secondary'
      );
      expect(cancelButton).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up subscriptions on destroy', () => {
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
