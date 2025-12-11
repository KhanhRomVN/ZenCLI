import { useState } from 'react'
import { Modal, Input, Button, Card, CardBody } from '@khanhromvn/zenui'
import { Plus, Search, User, Trash2 } from 'lucide-react'

interface Account {
  id: string
  name: string
  email?: string
  orgId: string
}

interface SelectAccountModalProps {
  open: boolean
  onClose: () => void
  accounts: Account[]
  usedAccountIds: string[]
  onSelectAccount: (accountId: string) => void
  onAddAccount: () => void
  onRemoveAccount?: (accountId: string) => void
}

export default function SelectAccountModal({
  open,
  onClose,
  accounts,
  usedAccountIds,
  onSelectAccount,
  onAddAccount,
  onRemoveAccount
}: SelectAccountModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter available accounts (not in use)
  const availableAccounts = accounts.filter((account) => !usedAccountIds.includes(account.id))

  const filteredAccounts = availableAccounts.filter((account) =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleClose = () => {
    setSearchQuery('')
    onClose()
  }

  const handleSelect = (accountId: string) => {
    onSelectAccount(accountId)
    setSearchQuery('')
  }

  const handleRemove = (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation()
    if (onRemoveAccount) {
      onRemoveAccount(accountId)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      animation="scale"
      className="bg-card-background"
    >
      <Card className="rounded-lg border-0 shadow-none">
        <CardBody>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                <Search size={16} />
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accounts..."
                className="pl-10 bg-input-background border-input-border-default hover:border-input-border-hover focus:border-input-border-focus text-text-primary"
              />
            </div>

            {/* Account List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => (
                  <Card
                    key={account.id}
                    onClick={() => handleSelect(account.id)}
                    className="cursor-pointer rounded-lg border-border-default hover:border-border-hover transition-all group hover:shadow-md hover:-translate-y-0.5"
                  >
                    <CardBody>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{account.name}</p>
                          {account.email && account.email !== account.name && (
                            <p className="text-xs text-text-primary/70">{account.email}</p>
                          )}
                          <p className="text-xs text-text-secondary">
                            ID: {account.orgId.slice(0, 8)}...
                          </p>
                        </div>
                        {onRemoveAccount && (
                          <button
                            onClick={(e) => handleRemove(e, account.id)}
                            className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove account"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                ))
              ) : (
                <Card className="rounded-lg border-border-default">
                  <CardBody>
                    <div className="text-center py-6">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-card-background border border-border-default flex items-center justify-center">
                        <User size={24} className="text-text-secondary" />
                      </div>
                      <p className="text-text-secondary">
                        {searchQuery ? 'No accounts found' : 'No available accounts'}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {!searchQuery && 'All accounts are currently in use'}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border-default" />

            {/* Add Account Button */}
            <Button
              onClick={onAddAccount}
              className="w-full bg-button-bg hover:bg-button-bgHover text-button-bgText border-button-border hover:border-button-borderHover flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add New Account
            </Button>
          </div>
        </CardBody>
      </Card>
    </Modal>
  )
}
